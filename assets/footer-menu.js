// Menu toggling for footer.
document.addEventListener('DOMContentLoaded', function () {
  const toggleButtons = document.querySelectorAll('.toggle-menu');

  toggleButtons.forEach((button) => {
    button.addEventListener('click', function () {
      const menu = document.getElementById(this.getAttribute('aria-controls'));
      const expanded = this.getAttribute('aria-expanded') === 'true' || false;
      this.setAttribute('aria-expanded', !expanded);
      menu.classList.toggle('twcss-hidden');
    });
  });
});
