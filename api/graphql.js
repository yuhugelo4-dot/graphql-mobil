const { ApolloServer } = require("@apollo/server");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const typeDefs = `
  type Mobil {
    id: ID!
    type: String!
    harga: Float!
    produksi_per_tahun: Int!
    penjualan: [Penjualan!]!
  }

  type Penjualan {
    id: ID!
    mobil_id: Int!
    bulan: String!
    unit_terjual: Int!
    mobil: Mobil!
  }

  type Query {
    mobil: [Mobil!]!
    penjualan: [Penjualan!]!
    mobilById(id: ID!): Mobil
  }
`;

const resolvers = {
  Query: {
    mobil: async () => {
      const result = await pool.query(
        "SELECT * FROM mobil"
      );
      return result.rows;
    },

    penjualan: async () => {
      const result = await pool.query(
        "SELECT * FROM penjualan"
      );
      return result.rows;
    },

    mobilById: async (_, { id }) => {
      const result = await pool.query(
        "SELECT * FROM mobil WHERE id = $1",
        [id]
      );

      return result.rows[0] || null;
    }
  },

  Mobil: {
    penjualan: async (parent) => {
      const result = await pool.query(
        "SELECT * FROM penjualan WHERE mobil_id = $1",
        [parent.id]
      );

      return result.rows;
    }
  },

  Penjualan: {
    mobil: async (parent) => {
      const result = await pool.query(
        "SELECT * FROM mobil WHERE id = $1",
        [parent.mobil_id]
      );

      return result.rows[0] || null;
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true
});

// Pastikan Apollo Server sudah start sebelum menerima request
const serverStarted = server.start();

module.exports = async (req, res) => {
  // CORS
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://studio.apollographql.com"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  // Preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // GET
  if (req.method === "GET") {
    res.status(200).json({
      message: "GraphQL API berhasil berjalan"
    });
    return;
  }

  // Hanya POST
  if (req.method !== "POST") {
    res.status(405).json({
      error: "Method not allowed"
    });
    return;
  }

  try {
    // Tunggu Apollo Server selesai start
    await serverStarted;

    // Pastikan body tersedia
    let body = req.body;

    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    if (!body || !body.query) {
      res.status(400).json({
        error: "GraphQL query tidak ditemukan"
      });
      return;
    }

    const result = await server.executeOperation({
      query: body.query,
      variables: body.variables,
      operationName: body.operationName
    });

    if (result.body.kind === "single") {
      res.status(200).json(result.body.singleResult);
      return;
    }

    res.status(200).json(result.body);
  } catch (error) {
    console.error("GRAPHQL ERROR:", error);

    res.status(500).json({
      error: "GraphQL server error",
      message: error.message
    });
  }
};