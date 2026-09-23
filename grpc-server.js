const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { Pool } = require("pg");
require("dotenv").config();

const PROTO_PATH = path.join(__dirname, "mobil.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const proto = grpc.loadPackageDefinition(packageDefinition);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function getMobil(call, callback) {
  const id = Number(call.request.id);

  if (!Number.isInteger(id) || id < 1) {
    callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: "id harus berupa bilangan bulat positif"
    });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT id, type, harga, produksi_per_tahun FROM mobil WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      callback({
        code: grpc.status.NOT_FOUND,
        message: `Mobil dengan id ${id} tidak ditemukan`
      });
      return;
    }

    const mobil = result.rows[0];
    callback(null, {
      id: Number(mobil.id),
      type: mobil.type,
      harga: Number(mobil.harga),
      produksi_per_tahun: Number(mobil.produksi_per_tahun)
    });
  } catch (error) {
    console.error("Gagal mengambil data mobil:", error.message);
    callback({
      code: grpc.status.INTERNAL,
      message: "Gagal mengambil data mobil"
    });
  }
}

const server = new grpc.Server();
server.addService(proto.MobilService.service, {
  GetMobil: getMobil
});

const port = process.env.PORT || 50051;
const address = `0.0.0.0:${port}`;

server.bindAsync(
  address,
  grpc.ServerCredentials.createInsecure(),
  (error, boundPort) => {
    if (error) {
      console.error("Gagal menjalankan gRPC server:", error.message);
      process.exit(1);
    }

    console.log(`gRPC server berjalan di ${address.replace(String(port), String(boundPort))}`);
  }
);