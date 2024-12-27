const cnpjField = document.getElementById('cnpj');

// Permitir apenas números ao digitar no campo do CNPJ
cnpjField.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, ''); // Remove qualquer caractere que não seja número
});

// Buscar dados ao sair do campo CNPJ
cnpjField.addEventListener('blur', async function () {
    const cnpj = this.value; // Agora o valor já será apenas números
    console.log('CNPJ inserido:', cnpj);

    if (cnpj.length === 14) {
        try {
            const response = await fetch(`https://api.cnpjs.dev/v1/${cnpj}`);
            console.log('Status da resposta:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Dados recebidos:', data);

                // Preencher os campos do formulário
                const razaoSocialField = document.getElementById('razaoSocial');
                if (razaoSocialField) razaoSocialField.value = data.razao_social;

                const nomeFantasiaField = document.getElementById('nomeFantasia');
                if (nomeFantasiaField) nomeFantasiaField.value = data.nome_fantasia;

                const logradouroField = document.getElementById('logradouro');
                if (logradouroField) logradouroField.value = data.endereco.logradouro;

                const numeroField = document.querySelector('input[name="numero"]');
                if (numeroField && data.endereco.numero) numeroField.value = data.endereco.numero;

                const complementoField = document.querySelector('input[name="complemento"]');
                if (complementoField && data.endereco.complemento) complementoField.value = data.endereco.complemento;

                const bairroField = document.getElementById('bairro');
                if (bairroField) bairroField.value = data.endereco.bairro;

                const cidadeField = document.getElementById('cidade');
                if (cidadeField) cidadeField.value = data.endereco.municipio;

                const ufField = document.getElementById('uf');
                if (ufField) ufField.value = data.endereco.uf;

                const cepField = document.getElementById('cep');
                if (cepField) cepField.value = data.endereco.cep;

                const telefoneField = document.querySelector('input[name="telefone"]');
                if (telefoneField && data.telefone1) telefoneField.value = data.telefone1;
            } else {
                console.error('Erro ao buscar os dados do CNPJ.');
                alert('Erro ao buscar os dados do CNPJ. Verifique o CNPJ e tente novamente.');
            }
        } catch (error) {
            console.error('Erro ao buscar o CNPJ:', error);
            alert('Erro ao buscar o CNPJ. Verifique o CNPJ e tente novamente.');
        }
    } else {
        alert('CNPJ inválido. Insira um CNPJ com 14 dígitos.');
    }
});
