// Seleciona o botão e o menu
const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.querySelector('.nav-links');

// Adiciona evento de clique para alternar a exibição do menu
menuToggle.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});
