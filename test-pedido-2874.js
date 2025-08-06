// Teste para consultar pedido 2874 na API do Tiny ERP
const token = 'f9bb8c4cac6afcd7cd5f6609741550a18efc6e5616dbe8db14720b83737742f2';

const params = new URLSearchParams({
  token: token,
  formato: 'json',
  id: '2874'
});

fetch('https://api.tiny.com.br/api2/pedido.obter.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: params.toString()
})
.then(response => response.json())
.then(data => {
  console.log('=== RESPOSTA COMPLETA DA API TINY ERP ===');
  console.log('Pedido 2874 - Dados completos:');
  console.log(JSON.stringify(data, null, 2));
})
.catch(error => {
  console.error('Erro:', error);
});