const axios = require("axios");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

if (!OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY in environment");
}

async function getChatCompletion(messages, options = {}) {
  const response = await axios.post(
    OPENAI_API_URL,
    {
      model: OPENAI_MODEL,
      messages,
      ...options,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data.choices[0].message.content;
}

async function extractKeywords(text) {
  const prompt = [
    {
      role: "system",
      content:
        "Extract 5-10 relevant keywords or entities from the following text. Return as a comma-separated list.",
    },
    { role: "user", content: text },
  ];
  const result = await getChatCompletion(prompt, { max_tokens: 60 });
  return result
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

async function extractEntities(text) {
  const prompt = [
    {
      role: "system",
      content: `Extract entities from text. Return JSON only:
{
  "people": ["person names"],
  "organizations": ["company/org names"],
  "dates": ["dates in ISO format"],
  "numbers": ["important numbers with context"],
  "locations": ["places, addresses"],
  "other": ["other significant entities"]
}`,
    },
    { role: "user", content: text.slice(0, 4000) }, 
  ];
  
  try {
    const result = await getChatCompletion(prompt, { 
      max_tokens: 300,
      temperature: 0.1 
    });
    
    let cleanResult = result.trim();
    if (cleanResult.startsWith('```json')) {
      cleanResult = cleanResult.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanResult.startsWith('```')) {
      cleanResult = cleanResult.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const entities = JSON.parse(cleanResult);
    
    return {
      people: Array.isArray(entities.people) ? entities.people.slice(0, 10) : [],
      organizations: Array.isArray(entities.organizations) ? entities.organizations.slice(0, 10) : [],
      dates: Array.isArray(entities.dates) ? entities.dates.slice(0, 10) : [],
      numbers: Array.isArray(entities.numbers) ? entities.numbers.slice(0, 10) : [],
      locations: Array.isArray(entities.locations) ? entities.locations.slice(0, 10) : [],
      other: Array.isArray(entities.other) ? entities.other.slice(0, 10) : []
    };
  } catch (error) {
    console.error("Entity extraction error:", error);
    return {
      people: [],
      organizations: [],
      dates: [],
      numbers: [],
      locations: [],
      other: []
    };
  }
}

async function classifyContent(text, filename = "") {
  const controlledTags = [
    'work', 'personal', 'task', 'deal', 'idea', 'finance', 'health', 
    'meeting', 'project', 'research', 'legal', 'contract', 'invoice',
    'report', 'presentation', 'notes', 'documentation', 'education',
    'travel', 'reference'
  ];

  const prompt = [
    {
      role: "system",
      content: `Classify content into categories: ${controlledTags.join(', ')}. Return comma-separated list.`,
    },
    { 
      role: "user", 
      content: `Filename: ${filename}\n\nContent: ${text.slice(0, 2000)}` 
    },
  ];
  
  try {
    const result = await getChatCompletion(prompt, { 
      max_tokens: 50,
      temperature: 0.1 
    });
    
    const tags = result
      .split(",")
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => controlledTags.includes(tag))
      .slice(0, 3); // Limit to 3 tags max
    
    return tags.length > 0 ? tags : ['reference'];
  } catch (error) {
    console.error("Content classification error:", error);
    return ['reference'];
  }
}

async function getEmbeddings(texts) {
  if (!Array.isArray(texts)) texts = [texts];
  
  const embeddings = texts.map(text => {
    const hash = text.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const embedding = new Array(1536).fill(0);
    for (let i = 0; i < 1536; i++) {
      embedding[i] = Math.sin(hash + i) * 0.1;
    }
    return embedding;
  });
  
  return embeddings;
}

async function findRelevantChunks(query, chunks, maxResults = 5) {
  if (!chunks || chunks.length === 0) return [];
  
  try {
    const chunksText = chunks.map((chunk, index) => 
      `[${index}] ${chunk.chunk_text.substring(0, 500)}...`
    ).join('\n\n');
    
    const prompt = `Find most relevant chunks for query: "${query}"

Chunks:
${chunksText}

Return JSON array of chunk indices (0-based), max ${maxResults}. Example: [2, 0, 4]`;

    const result = await getChatCompletion([
      { role: 'user', content: prompt }
    ], { max_tokens: 100, temperature: 0.1 });
    
    let cleanResult = result.trim();
    if (cleanResult.startsWith('```json')) {
      cleanResult = cleanResult.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanResult.startsWith('```')) {
      cleanResult = cleanResult.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const relevantIndices = JSON.parse(cleanResult);
    
    if (!Array.isArray(relevantIndices)) {
      throw new Error('Invalid response format');
    }
    
    const relevantChunks = relevantIndices
      .filter(index => index >= 0 && index < chunks.length)
      .map(index => ({
        ...chunks[index],
        similarity: 1.0 - (index * 0.1)
      }));
    
    return relevantChunks;
    
  } catch (error) {
    console.error('RAG error:', error);
    return chunks.slice(0, maxResults).map((chunk, index) => ({
      ...chunk,
      similarity: 1.0 - (index * 0.1)
    }));
  }
}

async function getEmbedding(text) {
  const [embedding] = await getEmbeddings([text]);
  return embedding;
}

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (normA * normB);
}

module.exports = {
  getChatCompletion,
  extractKeywords,
  extractEntities,
  classifyContent,
  getEmbedding,
  getEmbeddings,
  findRelevantChunks,
  cosineSimilarity,
};
