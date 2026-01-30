import mongoose from "mongoose";

const PagamentoSchema = new mongoose.Schema({
  rifa_id: String,
  contato: String,
  email_mp: String,
  quantidade: Number,
  valor_total: Number,
  payment_id: { type: String, unique: true },
  status: { type: String, default: "pendente" },

  createdAt: { type: Date, default: Date.now },

  // ⏱ expira em 10 minutos
  expiresAt: {
    type: Date,
    index: { expires: 0 } // TTL
  }
});

export default mongoose.models.Pagamento ||
  mongoose.model("Pagamento", PagamentoSchema);
