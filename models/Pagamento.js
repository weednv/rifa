import mongoose from "mongoose";

const PagamentoSchema = new mongoose.Schema({
  rifa_id: String,
  contato: String,
  quantidade: Number,
  valor_total: Number,
  payment_id: String,
  status: { type: String, default: "pendente" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Pagamento ||
  mongoose.model("Pagamento", PagamentoSchema);
