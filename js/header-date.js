const elDate = document.getElementById('header-date');
if (elDate) {
    const dataHeader = new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
    elDate.textContent = dataHeader.charAt(0).toUpperCase() + dataHeader.slice(1);
}