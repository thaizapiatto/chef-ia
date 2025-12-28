"use client";

import { useState, useEffect } from "react";
import { Upload, Camera, Sparkles, Flame, Clock, ChefHat, X, Heart, Share2, Leaf, Apple, AlertCircle, Users, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";

interface NutritionInfo {
  protein?: string;
  carbs?: string;
  fiber?: string;
  fat?: string;
}

interface Recipe {
  id?: string;
  user_id?: string;
  name: string;
  type: "doce" | "salgado";
  ingredients: string[];
  instructions: string[];
  prep_time: string;
  calories: number;
  servings: number;
  difficulty?: "fácil" | "médio" | "difícil";
  tags?: string[];
  nutrition_info?: NutritionInfo;
  images?: string[];
  detected_ingredients?: string[];
  created_at?: string;
}

export default function Home() {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [detectedIngredients, setDetectedIngredients] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>("");
  const [userId] = useState<string>(() => {
    // Gerar ID único para o usuário (simulação simples)
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('fitchef_user_id');
      if (!id) {
        id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('fitchef_user_id', id);
      }
      return id;
    }
    return 'anonymous';
  });

  // Carregar receitas salvas do Supabase
  useEffect(() => {
    loadSavedRecipes();
    loadFavorites();
  }, []);

  const loadSavedRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedRecipes = data.map(recipe => ({
          id: recipe.id,
          user_id: recipe.user_id,
          name: recipe.name,
          type: recipe.type as "doce" | "salgado",
          ingredients: recipe.ingredients as string[],
          instructions: recipe.instructions as string[],
          prep_time: recipe.prep_time,
          calories: recipe.calories,
          servings: recipe.servings,
          difficulty: recipe.difficulty as "fácil" | "médio" | "difícil" | undefined,
          tags: recipe.tags as string[] | undefined,
          nutrition_info: recipe.nutrition_info as NutritionInfo | undefined,
          images: recipe.images as string[] | undefined,
          detected_ingredients: recipe.detected_ingredients as string[] | undefined,
          created_at: recipe.created_at,
        }));
        setSavedRecipes(formattedRecipes);
      }
    } catch (error) {
      console.error('Erro ao carregar receitas:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('recipe_id')
        .eq('user_id', userId);

      if (error) throw error;

      if (data) {
        const favoriteIds = new Set(data.map(f => f.recipe_id));
        setFavorites(favoriteIds);
      }
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles = Array.from(files).filter(file => {
      const isImage = file.type.startsWith('image/');
      const isUnder10MB = file.size < 10 * 1024 * 1024;
      return isImage && isUnder10MB;
    });

    if (validFiles.length !== files.length) {
      setError("Alguns arquivos foram ignorados. Use apenas imagens menores que 10MB.");
      setTimeout(() => setError(""), 5000);
    }

    const newImages: string[] = [];
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result as string);
        if (newImages.length === validFiles.length) {
          setImages((prev) => [...prev, ...newImages]);
          setError("");
        }
      };
      reader.onerror = () => {
        setError("Erro ao carregar imagem. Tente novamente.");
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleFavorite = async (recipeId: string) => {
    try {
      if (favorites.has(recipeId)) {
        // Remover favorito
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('recipe_id', recipeId);

        if (error) throw error;

        setFavorites((prev) => {
          const newFavorites = new Set(prev);
          newFavorites.delete(recipeId);
          return newFavorites;
        });
      } else {
        // Adicionar favorito
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: userId, recipe_id: recipeId });

        if (error) throw error;

        setFavorites((prev) => {
          const newFavorites = new Set(prev);
          newFavorites.add(recipeId);
          return newFavorites;
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error);
      alert("❌ Erro ao atualizar favorito. Tente novamente.");
    }
  };

  const saveRecipe = async (recipe: Recipe) => {
    try {
      const recipeData = {
        user_id: userId,
        name: recipe.name,
        type: recipe.type,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prep_time: recipe.prep_time,
        calories: recipe.calories,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        tags: recipe.tags,
        nutrition_info: recipe.nutrition_info,
        images: images,
        detected_ingredients: detectedIngredients,
      };

      const { data, error } = await supabase
        .from('recipes')
        .insert(recipeData)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newRecipe = {
          id: data.id,
          user_id: data.user_id,
          name: data.name,
          type: data.type as "doce" | "salgado",
          ingredients: data.ingredients as string[],
          instructions: data.instructions as string[],
          prep_time: data.prep_time,
          calories: data.calories,
          servings: data.servings,
          difficulty: data.difficulty as "fácil" | "médio" | "difícil" | undefined,
          tags: data.tags as string[] | undefined,
          nutrition_info: data.nutrition_info as NutritionInfo | undefined,
          images: data.images as string[] | undefined,
          detected_ingredients: data.detected_ingredients as string[] | undefined,
          created_at: data.created_at,
        };
        setSavedRecipes((prev) => [newRecipe, ...prev]);
        alert("✅ Receita salva com sucesso no Supabase!");
      }
    } catch (error) {
      console.error('Erro ao salvar receita:', error);
      alert("❌ Erro ao salvar receita. Tente novamente.");
    }
  };

  const deleteRecipe = async (recipeId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta receita?")) return;

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId)
        .eq('user_id', userId);

      if (error) throw error;

      setSavedRecipes((prev) => prev.filter((r) => r.id !== recipeId));
      alert("✅ Receita excluída com sucesso!");
    } catch (error) {
      console.error('Erro ao excluir receita:', error);
      alert("❌ Erro ao excluir receita. Tente novamente.");
    }
  };

  const analyzeIngredients = async () => {
    if (images.length === 0) return;

    setLoading(true);
    setRecipes([]);
    setDetectedIngredients([]);
    setError("");

    try {
      const response = await fetch("/api/analyze-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.details 
          ? `${data.error}\n\n${data.details}`
          : data.error || "Erro ao processar imagens";
        throw new Error(errorMessage);
      }

      setDetectedIngredients(data.ingredients);
      setRecipes(data.recipes);
    } catch (error: any) {
      console.error("Erro ao analisar ingredientes:", error);
      const errorMessage = error.message || "Erro ao analisar ingredientes. Tente novamente.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "fácil":
        return "bg-green-100 text-green-700 border-green-200";
      case "médio":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "difícil":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const shareRecipe = async (recipe: Recipe) => {
    const nutritionText = recipe.nutrition_info 
      ? `\n\n📊 Informações Nutricionais (por porção):\n• Proteínas: ${recipe.nutrition_info.protein || 'N/A'}\n• Carboidratos: ${recipe.nutrition_info.carbs || 'N/A'}\n• Fibras: ${recipe.nutrition_info.fiber || 'N/A'}\n• Gorduras: ${recipe.nutrition_info.fat || 'N/A'}`
      : '';

    const text = `🥗 ${recipe.name}\n\n📋 Ingredientes:\n${recipe.ingredients.map(i => `• ${i}`).join('\n')}\n\n👨‍🍳 Modo de Preparo:\n${recipe.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}\n\n⏱️ Tempo: ${recipe.prep_time} | 🔥 ${recipe.calories} kcal | 🍽️ ${recipe.servings} porções${nutritionText}\n\n✨ Receita saudável gerada por FitChef`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `🥗 ${recipe.name}`,
          text: text,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          copyToClipboard(text);
        }
      }
    } else {
      copyToClipboard(text);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("✅ Receita copiada! Cole no WhatsApp, Telegram ou onde quiser compartilhar com seus amigos!");
    }).catch(() => {
      alert("❌ Erro ao copiar. Tente novamente.");
    });
  };

  const shareViaWhatsApp = (recipe: Recipe) => {
    const nutritionText = recipe.nutrition_info 
      ? `\n\n📊 *Informações Nutricionais* (por porção):\n• Proteínas: ${recipe.nutrition_info.protein || 'N/A'}\n• Carboidratos: ${recipe.nutrition_info.carbs || 'N/A'}\n• Fibras: ${recipe.nutrition_info.fiber || 'N/A'}\n• Gorduras: ${recipe.nutrition_info.fat || 'N/A'}`
      : '';

    const text = `🥗 *${recipe.name}*\n\n📋 *Ingredientes:*\n${recipe.ingredients.map(i => `• ${i}`).join('\n')}\n\n👨‍🍳 *Modo de Preparo:*\n${recipe.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}\n\n⏱️ Tempo: ${recipe.prep_time} | 🔥 ${recipe.calories} kcal | 🍽️ ${recipe.servings} porções${nutritionText}\n\n✨ Receita saudável gerada por FitChef`;
    
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const renderRecipeCard = (recipe: Recipe, index: number, isSaved: boolean = false) => {
    const recipeId = recipe.id || `temp-${index}`;

    return (
      <Card
        key={recipeId}
        className="p-6 bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-2 border-gray-100 hover:border-green-200"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="text-xl font-bold text-gray-800 mb-3 leading-tight">
              {recipe.name}
            </h4>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={recipe.type === "doce" ? "default" : "secondary"}
                className={
                  recipe.type === "doce"
                    ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
                    : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                }
              >
                {recipe.type === "doce" ? "🍰 Doce" : "🥗 Salgado"}
              </Badge>
              {recipe.difficulty && (
                <Badge
                  variant="outline"
                  className={getDifficultyColor(recipe.difficulty)}
                >
                  {recipe.difficulty}
                </Badge>
              )}
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <Leaf className="w-3 h-3 mr-1" />
                Saudável
              </Badge>
            </div>
          </div>
          {isSaved && recipeId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleFavorite(recipeId)}
              className={`transition-all duration-300 transform hover:scale-110 ${
                favorites.has(recipeId) ? "text-red-500" : "text-gray-400"
              }`}
            >
              <Heart
                className={`w-6 h-6 ${favorites.has(recipeId) ? "fill-current" : ""}`}
              />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-4 mb-5 text-sm">
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-blue-700">{recipe.prep_time}</span>
          </div>
          <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg">
            <Flame className="w-4 h-4 text-orange-600" />
            <span className="font-semibold text-orange-700">
              {recipe.calories} kcal
            </span>
          </div>
          <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg">
            <ChefHat className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-green-700">{recipe.servings} porções</span>
          </div>
        </div>

        {recipe.nutrition_info && (
          <div className="mb-5 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
            <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Apple className="w-4 h-4 text-green-600" />
              Informações Nutricionais (por porção)
            </h5>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {recipe.nutrition_info.protein && (
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">💪</span>
                  <span className="text-gray-700">Proteínas: <strong>{recipe.nutrition_info.protein}</strong></span>
                </div>
              )}
              {recipe.nutrition_info.carbs && (
                <div className="flex items-center gap-2">
                  <span className="text-amber-600 font-bold">🌾</span>
                  <span className="text-gray-700">Carboidratos: <strong>{recipe.nutrition_info.carbs}</strong></span>
                </div>
              )}
              {recipe.nutrition_info.fiber && (
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">🥬</span>
                  <span className="text-gray-700">Fibras: <strong>{recipe.nutrition_info.fiber}</strong></span>
                </div>
              )}
              {recipe.nutrition_info.fat && (
                <div className="flex items-center gap-2">
                  <span className="text-yellow-600 font-bold">🥑</span>
                  <span className="text-gray-700">Gorduras: <strong>{recipe.nutrition_info.fat}</strong></span>
                </div>
              )}
            </div>
          </div>
        )}

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.tags.map((tag, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs bg-green-50 text-green-600 border-green-200"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mb-5 bg-gray-50 p-4 rounded-xl">
          <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-green-500">📋</span>
            Ingredientes
          </h5>
          <ul className="space-y-2">
            {recipe.ingredients.map((ingredient, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-green-500 font-bold mt-0.5">•</span>
                <span>{ingredient}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl">
          <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-emerald-500">👨‍🍳</span>
            Modo de Preparo
          </h5>
          <ol className="space-y-3">
            {recipe.instructions.map((instruction, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-3">
                <span className="font-bold text-white bg-gradient-to-br from-green-500 to-emerald-500 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs">
                  {i + 1}
                </span>
                <span className="pt-0.5">{instruction}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex gap-2 mt-5 pt-5 border-t border-gray-200">
          {!isSaved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveRecipe(recipe)}
              className="flex-1 hover:bg-green-50 hover:text-green-600 hover:border-green-300 transition-all"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          )}
          {isSaved && recipeId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteRecipe(recipeId)}
              className="flex-1 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => shareRecipe(recipe)}
            className="flex-1 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => shareViaWhatsApp(recipe)}
            className="flex-1 hover:bg-green-50 hover:text-green-600 hover:border-green-300 transition-all"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            WhatsApp
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <header className="border-b bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-2.5 rounded-2xl shadow-lg">
                <Leaf className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  FitChef
                </h1>
                <p className="text-xs text-gray-600 font-medium">Receitas saudáveis com IA</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4 text-green-500" />
                <span className="font-semibold">10k+ usuários</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Apple className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold">100% saudável</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
          </Alert>
        )}

        {/* Saved Recipes Section */}
        {savedRecipes.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <Heart className="w-8 h-8 text-red-500 fill-current" />
                Minhas Receitas Salvas
              </h3>
              <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 text-sm">
                {savedRecipes.length} {savedRecipes.length === 1 ? "receita" : "receitas"}
              </Badge>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
              {savedRecipes.map((recipe, index) => renderRecipeCard(recipe, index, true))}
            </div>
          </div>
        )}

        {/* Hero Section */}
        {images.length === 0 && recipes.length === 0 && (
          <div className="text-center mb-12 py-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-green-100 to-emerald-100 p-8 rounded-full">
                  <Leaf className="w-20 h-20 text-green-600" />
                </div>
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Receitas Saudáveis e Nutritivas
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              Transforme seus ingredientes em receitas saudáveis, equilibradas e deliciosas. Compartilhe com seus amigos e inspire uma vida mais saudável!
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-2 hover:shadow-lg transition-all">
                <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Leaf className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2">100% Saudável</h3>
                <p className="text-sm text-gray-600">Receitas nutritivas, balanceadas e ricas em nutrientes</p>
              </Card>
              
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-2 hover:shadow-lg transition-all">
                <div className="bg-emerald-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Compartilhe Facilmente</h3>
                <p className="text-sm text-gray-600">Envie receitas para amigos via WhatsApp ou redes sociais</p>
              </Card>
              
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-2 hover:shadow-lg transition-all">
                <div className="bg-teal-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Apple className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="font-bold text-gray-800 mb-2">Info Nutricional</h3>
                <p className="text-sm text-gray-600">Detalhes completos de proteínas, carboidratos e fibras</p>
              </Card>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <Card className="p-8 mb-8 bg-white/90 backdrop-blur-sm shadow-xl border-2 border-dashed border-gray-300 hover:border-green-400 transition-all duration-300">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-5 rounded-2xl">
                <Camera className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">
              {images.length > 0 ? "Adicione mais ingredientes" : "Fotografe seus ingredientes"}
            </h2>
            <p className="text-gray-600 mb-6">
              {images.length > 0 
                ? "Quanto mais ingredientes, mais opções de receitas saudáveis você terá" 
                : "Tire fotos claras dos alimentos que você tem disponível"}
            </p>

            <label htmlFor="file-upload">
              <Button
                size="lg"
                className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                asChild
              >
                <span>
                  <Upload className="w-5 h-5 mr-2" />
                  {images.length > 0 ? "Adicionar Mais Fotos" : "Adicionar Fotos"}
                </span>
              </Button>
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            
            {images.length > 0 && (
              <p className="text-sm text-gray-500 mt-4">
                {images.length} {images.length === 1 ? "foto adicionada" : "fotos adicionadas"}
              </p>
            )}
          </div>

          {images.length > 0 && (
            <div className="mt-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((img, index) => (
                  <div key={index} className="relative group">
                    <div className="relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                      <img
                        src={img}
                        alt={`Ingrediente ${index + 1}`}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {images.length > 0 && (
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                onClick={analyzeIngredients}
                disabled={loading}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                    Gerando receitas saudáveis...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Gerar Receitas Saudáveis
                  </>
                )}
              </Button>
              
              {!loading && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    setImages([]);
                    setRecipes([]);
                    setDetectedIngredients([]);
                    setError("");
                  }}
                  className="border-2 hover:bg-gray-50"
                >
                  <X className="w-5 h-5 mr-2" />
                  Limpar Tudo
                </Button>
              )}
            </div>
          )}
        </Card>

        {detectedIngredients.length > 0 && (
          <Card className="p-6 mb-8 bg-white/90 backdrop-blur-sm shadow-lg border-2 border-green-200">
            <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-500" />
              Ingredientes Identificados ({detectedIngredients.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {detectedIngredients.map((ingredient, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 hover:from-green-200 hover:to-emerald-200 px-4 py-2 text-sm font-medium border border-green-200 transition-all duration-300 transform hover:scale-105"
                >
                  {ingredient}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {recipes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <Leaf className="w-8 h-8 text-green-600" />
                Suas Receitas Saudáveis
              </h3>
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 text-sm">
                {recipes.length} {recipes.length === 1 ? "receita" : "receitas"}
              </Badge>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
              {recipes.map((recipe, index) => renderRecipeCard(recipe, index, false))}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-xl">
              <Leaf className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-gray-600 text-sm">
            FitChef - Receitas nutritivas para uma vida melhor
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Powered by OpenAI GPT-4 Vision | Compartilhe saúde com seus amigos
          </p>
        </div>
      </footer>
    </div>
  );
}
