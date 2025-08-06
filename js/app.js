// In the updateCompanyBranding function, update the default company name:
updateCompanyBranding() {
    const companyName = localStorage.getItem('companyName') || 'Your Company Name';
    const logoUrl = localStorage.getItem('companyLogo') || 'assets/logo.png';
    
    // Update all company name elements
    const nameElements = ['loginCompanyName', 'appCompanyName', 'companyNameEdit'];
    nameElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (element.tagName === 'INPUT') {
                element.value = companyName;
            } else {
                element.textContent = companyName;
            }
        }
    });
    
    // Update all logo elements
    const logoElements = ['loginLogo', 'appLogo'];
    logoElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.src = logoUrl;
        }
    });
}
