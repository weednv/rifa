import mongoose from "mongoose";

const NumeroSchema = new mongoose.Schema({
  numero: { type: Number, unique: true },
  contato: String,
  rifa_id: String,
  payment_id: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Numero ||
  mongoose.model("Numero", NumeroSchema);
