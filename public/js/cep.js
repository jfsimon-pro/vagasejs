document.addEventListener('DOMContentLoaded', () => {
  const cepField = document.getElementById('cep');

  if (cepField) {
    cepField.addEventListener('blur', buscarCEP); // Adiciona o evento ao campo CEP
  }
});

async function buscarCEP() {
  const cep = document.getElementById('cep').value.trim();

  if (cep.length !== 8 || isNaN(cep)) {
    alert('Por favor, insira um CEP válido com 8 dígitos.');
    return;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

    if (data.erro) {
      alert('CEP não encontrado.');
      return;
    }

    // Preenche os campos com os dados da API
    document.getElementById('logradouro').value = data.logradouro || '';
    document.getElementById('bairro').value = data.bairro || '';
    document.getElementById('cidade').value = data.localidade || '';
    document.getElementById('uf').value = data.uf || '';
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    alert('Erro ao buscar o CEP. Tente novamente.');
  }
}
