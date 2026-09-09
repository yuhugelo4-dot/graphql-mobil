const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { Pool } = require("pg");
require("dotenv").config();

// =====================================================
// KONEKSI DATABASE NEON
// =====================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// =====================================================
// GRAPHQL SCHEMA
// =====================================================

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

// =====================================================
// RESOLVER
// =====================================================

const resolvers = {

  Query: {

    // Mengambil semua data mobil
    mobil: async () => {
      const result = await pool.query(
        "SELECT * FROM mobil"
      );

      return result.rows;
    },

    // Mengambil semua data penjualan
    penjualan: async () => {
      const result = await pool.query(
        "SELECT * FROM penjualan"
      );

      return result.rows;
    },

    // Mengambil mobil berdasarkan ID
    mobilById: async (_, { id }) => {
      const result = await pool.query(
        "SELECT * FROM mobil WHERE id = $1",
        [id]
      );

      return result.rows[0] || null;
    }
  },

  // ===================================================
  // RELASI MOBIL → PENJUALAN
  // ===================================================

  Mobil: {

    penjualan: async (parent) => {
      const result = await pool.query(
        "SELECT * FROM penjualan WHERE mobil_id = $1",
        [parent.id]
      );

      return result.rows;
    }
  },

  // ===================================================
  // RELASI PENJUALAN → MOBIL
  // ===================================================

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

// =====================================================
// APOLLO SERVER
// =====================================================

const server = new ApolloServer({
  typeDefs,
  resolvers
});

// =====================================================
// JALANKAN SERVER
// =====================================================

startStandaloneServer(server, {
  listen: {
    port: process.env.PORT || 4000
  }
}).then(({ url }) => {
  console.log(`🚀 Server berjalan di ${url}`);
});