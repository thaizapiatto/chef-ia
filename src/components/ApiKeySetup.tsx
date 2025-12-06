"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";

interface ApiKeySetupProps {
  onComplete?: () => void;
}

export default function ApiKeySetup({ onComplete }: ApiKeySetupProps) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validateApiKey = (key: string): boolean => {
    // OpenAI keys start with sk- and have specific length
    return key.startsWith("sk-") && key.length > 20;
  };

  const handleSave = async () => {
    setError("");
    setSuccess(false);

    if (!apiKey.trim()) {
      setError("Por favor, insira sua chave API");
      return;
    }

    if (!validateApiKey(apiKey)) {
      setError("Formato de chave inválido. A chave deve começar com 'sk-'");
      return;
    }

    setLoading(true);

    try {
      // Test the API key with a simple request
      const response = await fetch("/api/test-openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao validar chave API");
      }

      setSuccess(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Erro ao validar chave API");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 bg-white/95 backdrop-blur-sm shadow-2xl border-2">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-orange-500 to-pink-500 p-4 rounded-2xl">
              <Key className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
            Configure sua Chave API OpenAI
          </h1>
          <p className="text-gray-600">
            Para usar o Chef IA, você precisa de uma chave da API OpenAI
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ✅ Chave API validada com sucesso! Redirecionando...
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <span>📋</span> Como obter sua chave API:
            </h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                <span>
                  Acesse{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold hover:text-blue-600 inline-flex items-center gap-1"
                  >
                    platform.openai.com/api-keys
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                <span>Faça login ou crie uma conta OpenAI</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">3.</span>
                <span>Clique em "Create new secret key"</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">4.</span>
                <span>Copie a chave (começa com "sk-")</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">5.</span>
                <span>Cole abaixo e clique em "Validar e Salvar"</span>
              </li>
            </ol>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Chave API OpenAI
            </label>
            <Input
              type="password"
              placeholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono text-sm"
              disabled={loading || success}
            />
            <p className="text-xs text-gray-500 mt-2">
              Sua chave é armazenada de forma segura e nunca é compartilhada
            </p>
          </div>

          {/* Action Button */}
          <Button
            size="lg"
            onClick={handleSave}
            disabled={loading || success || !apiKey.trim()}
            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-lg"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Validando...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Validado!
              </>
            ) : (
              <>
                <Key className="w-5 h-5 mr-2" />
                Validar e Salvar
              </>
            )}
          </Button>

          {/* Security Note */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-600 text-center">
              🔒 <strong>Segurança:</strong> Sua chave API é armazenada apenas
              no seu navegador e usada exclusivamente para suas requisições ao
              Chef IA.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
