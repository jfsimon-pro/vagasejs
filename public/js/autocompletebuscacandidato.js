document.addEventListener("DOMContentLoaded", () => {
    const cargoInput = document.getElementById("ocupacao");
    const suggestionsBox = document.getElementById("suggestions");
  
    cargoInput.addEventListener("input", async () => {
      const query = cargoInput.value.trim().toLowerCase();
      if (!query) {
        suggestionsBox.innerHTML = ""; // Limpar sugestões
        return;
      }
  
      try {
        // Carregar palavras-chave do arquivo JSON
        const response = await fetch("/data/keywords.json");
        const keywords = await response.json();
  
        // Filtrar palavras-chave que correspondem à busca
        const suggestions = keywords.filter((keyword) =>
          keyword.toLowerCase().includes(query)
        );
  
        // Exibir sugestões
        suggestionsBox.innerHTML = suggestions
          .map((suggestion) => `<div class="suggestion">${suggestion}</div>`)
          .join("");
  
        // Adicionar event listeners às sugestões
        document.querySelectorAll(".suggestion").forEach((item) => {
          item.addEventListener("click", () => {
            cargoInput.value = item.textContent;
            suggestionsBox.innerHTML = ""; // Limpar sugestões
          });
        });
      } catch (error) {
        console.error("Erro ao carregar palavras-chave:", error);
      }
    });
  
    // Fechar sugestões ao clicar fora
    document.addEventListener("click", (e) => {
      if (!suggestionsBox.contains(e.target) && e.target !== cargoInput) {
        suggestionsBox.innerHTML = "";
      }
    });
  });
  