// ADD THESE LOGO UTILITY FUNCTIONS TO YOUR EXISTING utils.js
// Place these functions in the "TOKEN-SPECIFIC UTILITIES" section

// ==============================================
// ENHANCED LOGO UTILITIES - ADD TO UTILS.JS
// ==============================================

// Generate reliable token logo fallback using UI Avatars
function generateTokenLogoFallback(symbol) {
    try {
        const cleanSymbol = String(symbol).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const firstChar = cleanSymbol.charAt(0) || 'T';
        
        // Use UI Avatars with TokenWars branding
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstChar)}&background=8b5cf6&color=fff&size=64&bold=true&format=png`;
    } catch (error) {
        console.error('Error generating logo fallback:', error);
        return 'https://ui-avatars.com/api/?name=T&background=8b5cf6&color=fff&size=64&bold=true&format=png';
    }
}

// Validate and fix token logo URLs
function validateAndFixTokenLogo(logoURI, symbol) {
    // If no logo or broken placeholder, generate fallback
    if (!logoURI || 
        logoURI.includes('placeholder-token.png') || 
        logoURI === '/placeholder-token.png' ||
        logoURI.includes('lastrrx.github.io') ||
        logoURI === 'null' ||
        logoURI === 'undefined') {
        
        console.log(`🖼️ Generating logo fallback for ${symbol}`);
        return generateTokenLogoFallback(symbol);
    }
    
    // Return existing logo if it looks valid
    return logoURI;
}

// Handle token logo loading errors (for HTML onerror)
function handleTokenLogoError(imgElement, symbol) {
    console.warn(`❌ Logo failed to load for ${symbol}, using fallback`);
    
    // Generate fallback logo
    const fallbackLogo = generateTokenLogoFallback(symbol);
    
    // Update the image source
    imgElement.src = fallbackLogo;
    
    // Add error class for styling
    imgElement.classList.add('logo-fallback');
    
    // Remove onerror to prevent infinite loops
    imgElement.onerror = null;
}

// Validate if a logo URL looks valid
function isValidLogoURL(url) {
    try {
        if (!url || typeof url !== 'string') return false;
        
        // Check if it's a valid URL
        new URL(url);
        
        // Check if it's likely an image
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
        const hasImageExtension = imageExtensions.some(ext => url.toLowerCase().includes(ext));
        
        // Allow known image services
        const imageServices = ['ui-avatars.com', 'coingecko.com', 'arweave.net', 'githubusercontent.com', 'jup.ag'];
        const isImageService = imageServices.some(service => url.includes(service));
        
        return hasImageExtension || isImageService;
    } catch (error) {
        return false;
    }
}

// Get token logo with fallback (comprehensive helper)
function getTokenLogoWithFallback(token) {
    try {
        if (!token) return generateTokenLogoFallback('TOKEN');
        
        const logoURI = token.logoURI || token.logo_uri || token.image;
        const symbol = token.symbol || 'TOKEN';
        
        return validateAndFixTokenLogo(logoURI, symbol);
    } catch (error) {
        console.error('Error getting token logo with fallback:', error);
        return generateTokenLogoFallback('TOKEN');
    }
}

// ==============================================
// UPDATE THE GLOBAL EXPORTS SECTION IN utils.js
// ==============================================

// ADD THESE TO THE EXISTING utils OBJECT:
/*
    // Logo utilities
    generateTokenLogoFallback,
    validateAndFixTokenLogo,
    handleTokenLogoError,
    isValidLogoURL,
    getTokenLogoWithFallback,
*/

// ADD THESE TO THE EXISTING window ASSIGNMENTS:
/*
    generateTokenLogoFallback,
    validateAndFixTokenLogo,
    handleTokenLogoError,
    isValidLogoURL,
    getTokenLogoWithFallback,
*/

console.log('✅ Logo utilities ready for integration into utils.js');
console.log('🖼️ Available functions:');
console.log('   - generateTokenLogoFallback(symbol)');
console.log('   - validateAndFixTokenLogo(logoURI, symbol)'); 
console.log('   - handleTokenLogoError(imgElement, symbol)');
console.log('   - isValidLogoURL(url)');
console.log('   - getTokenLogoWithFallback(token)');
