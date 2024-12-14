document.addEventListener('DOMContentLoaded', () => {
    const cnpjField = document.getElementById('cnpj');
  
    if (cnpjField) {
      cnpjField.addEventListener('blur', buscarCNPJ); // Vincula o evento de blur
    }
  });
  
  async function buscarCNPJ() {
    const cnpjField = document.getElementById('cnpj');
    const razaoSocialField = document.getElementById('razaoSocial');
    const nomeFantasiaField = document.getElementById('nomeFantasia');
  
    const cnpj = cnpjField.value.trim();
  
    // Valida o CNPJ
    if (cnpj.length !== 14 || isNaN(cnpj)) {
      alert('Por favor, insira um CNPJ válido com 14 dígitos.');
      return;
    }
  
    try {
      const response = await fetch(`https://api-publica.speedio.com.br/buscarcnpj?cnpj=${cnpj}`);
      
      if (!response.ok) {
        throw new Error('Erro na requisição para a API.');
      }
  
      const data = await response.json();
  
      if (data.error || !data['RAZAO SOCIAL'] || !data['NOME FANTASIA']) {
        alert('CNPJ não encontrado ou dados incompletos.');
        return;
      }
  
      // Preenche os campos com os dados da API
      razaoSocialField.value = data['RAZAO SOCIAL'] || '';
      nomeFantasiaField.value = data['NOME FANTASIA'] || '';
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      alert('Erro ao buscar o CNPJ. Tente novamente.');
    }
  }
  