import mongoose from "mongoose";

const NumeroSchema = new mongoose.Schema({
  numero: { type: Number, unique: true },
  rifa_id: String,
  contato: String,
  payment_id: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Numero || mongoose.model("Numero", NumeroSchema);
