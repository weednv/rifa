import mongoose from "mongoose";

const PagamentoSchema = new mongoose.Schema({
  rifa_id: String,
  contato: String,           // email ou whatsapp (o que o usuário digitou)
  email_mp: String,          // email que você manda pro Mercado Pago (pix@rifa.com etc)
  quantidade: Number,
  valor_total: Number,
  payment_id: { type: String, unique: true },
  status: { type: String, default: "pendente" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Pagamento || mongoose.model("Pagamento", PagamentoSchema);
