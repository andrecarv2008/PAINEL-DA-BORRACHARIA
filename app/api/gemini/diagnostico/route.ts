import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const { defeito, placa, tecnico } = await req.json();

    if (!defeito) {
      return NextResponse.json(
        { error: "O campo defeito é obrigatório." },
        { status: 400 }
      );
    }

    const prompt = `Você é um especialista em mecânica de suspensão, alinhamento e geometria veicular da oficina "Borracharia Pro".
Analise o seguinte defeito relatado pelo técnico ${tecnico || "da oficina"} no veículo de placa ${placa || "Não informada"}:
"${defeito}"

Forneça um diagnóstico direto contendo:
1. Possíveis Causas (máximo 3 pontos).
2. Peças de suspensão/direção que devem ser inspecionadas com urgência.
3. Riscos de segurança associados se não for consertado.
4. Recomendação de calibração ou rodízio de pneu relacionado (se aplicável).

Escreva a resposta de forma curta, direta, profissional e estruturada em português. Evite jargões científicos exagerados; foque no pragmatismo da oficina.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    return NextResponse.json({ diagnosis: response.text });
  } catch (error: any) {
    console.error("Erro na API do Gemini:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao gerar diagnóstico." },
      { status: 500 }
    );
  }
}
