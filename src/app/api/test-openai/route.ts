import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || !apiKey.startsWith("sk-")) {
      return NextResponse.json(
        { error: "Chave API inválida. Deve começar com 'sk-'" },
        { status: 400 }
      );
    }

    // Test the API key with a simple request
    const openai = new OpenAI({ apiKey });

    try {
      await openai.models.list();
      
      // If successful, return success
      return NextResponse.json({ 
        success: true,
        message: "Chave API validada com sucesso!" 
      });
    } catch (error: any) {
      if (error?.status === 401) {
        return NextResponse.json(
          { error: "Chave API inválida ou expirada" },
          { status: 401 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Erro ao testar chave API:", error);
    return NextResponse.json(
      { error: "Erro ao validar chave API" },
      { status: 500 }
    );
  }
}
