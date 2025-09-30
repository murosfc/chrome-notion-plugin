// Content Script to capture Notion data

class NotionCardExtractor {
  constructor() {
    this.currentCardData = null;
    
    this.setupMessageListener();
    this.observeChanges();
  }


  // Detects if we are on a valid Notion page
  isValidNotionPage() {
    const url = window.location.href;
    const hostname = window.location.hostname;
    
    // Check if domain is from Notion
    const isNotionDomain = hostname === 'www.notion.so' || hostname === 'notion.so';
    
    if (!isNotionDomain) {
      return false;
    }

    // Check if there is Notion interface content loaded
    const notionElements = [
      '.notion-app-inner',
      '.notion-page-view-block', 
      '.notion-page-content',
      '[data-block-id]',
      '.notion-topbar'
    ];

    const hasNotionUI = notionElements.some(selector => 
      document.querySelector(selector) !== null
    );

    if (!hasNotionUI) {
      return false;
    }

    return true;
  }

  // Principais seletores do Notion para capturar dados do card
  getCardSelectors() {
    return {
      // Main page title - selectors updated for 2024
      title: [
        'h1[data-content-editable-leaf="true"]',    // Main title
        '[data-content-editable-leaf="true"]:first-child', // First editable element
        '.notion-page-block [contenteditable="true"]',     // Page title
        '[placeholder*="Untitled"]',                        // Placeholder
        '.notion-title-block [contenteditable="true"]',    // Title block
        '.notion-page-view-block h1',                       // H1 in view
      ],
      
      // Content/description
      content: [
        '[data-block-id] [contenteditable="true"]',      // Blocos editáveis
        '.notion-text-block [contenteditable="true"]',   // Blocos de texto
        '.notion-page-content [contenteditable="true"]', // Conteúdo da página
        '[data-block-id] .notranslate',                  // Conteúdo dos blocos
      ],
      
      // Propriedades do database (se for um item de database)
      properties: [
        '.notion-database-view .notion-property',    // Propriedades do database
        '.notion-page-view .notion-property',        // Propriedades da página
        '.notion-collection-view .notion-property',  // Propriedades de collection
      ]
    };
  }

  // Extracts current card title with better detection for organizations
  extractTitle() {
    const selectors = this.getCardSelectors().title;
    
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      
      for (const element of elements) {
        const text = this.getTextContent(element);
        if (text && text.trim() && text.trim() !== 'Untitled' && text.length > 2) {
          return text.trim();
        }
      }
    }
    
    // Improved fallback: page title
    const pageTitle = document.title;
    
    if (pageTitle && pageTitle.trim() !== 'Untitled') {
      // Remove sufixos comuns do Notion
      let cleanTitle = pageTitle
        .replace(/\s*\|\s*Notion$/i, '')  // Remove " | Notion"
        .replace(/\s*-\s*Notion$/i, '')   // Remove " - Notion" 
        .replace(/^\s*Notion\s*\|\s*/, '') // Remove "Notion | "
        .replace(/^\s*Notion\s*-\s*/, '')  // Remove "Notion - "
        .trim();
      
      if (cleanTitle && cleanTitle !== 'Notion') {
        return cleanTitle;
      }
    }
    
    // Last fallback: search for any visible editable text
    const editableElements = document.querySelectorAll('[contenteditable="true"]');
    for (const element of editableElements) {
      const text = this.getTextContent(element);
      if (text && text.trim().length > 5 && !text.includes('\n')) {
        return text.trim();
      }
    }
    
    return null;
  }

  // Extrai conteúdo adicional do card
  extractContent() {
    const selectors = this.getCardSelectors().content;
    const contents = [];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      
      for (const element of elements) {
        const text = this.getTextContent(element);
        if (text && text.trim() && text.length > 10) {
          contents.push(text.trim());
        }
      }
    }
    
    // Remove duplicatas e pega os 3 primeiros blocos mais significativos
    const uniqueContents = [...new Set(contents)]
      .filter(content => content.length > 20)
      .slice(0, 3);
    
    return uniqueContents.join(' ');
  }

  // Extrai propriedades do database (tags, status, etc.)
  extractProperties() {
    const properties = {};
    const propertyElements = document.querySelectorAll('.notion-property');
    
    propertyElements.forEach(prop => {
      try {
        const label = prop.querySelector('.notion-property-title')?.textContent?.trim();
        const value = prop.querySelector('.notion-property-value')?.textContent?.trim();
        
        if (label && value) {
          properties[label] = value;
        }
      } catch (error) {
        // Ignorar erros de propriedades
      }
    });
    
    return properties;
  }

  // Utility to extract clean text
  getTextContent(element) {
    if (!element) return '';
    
    // Se for um input ou textarea
    if (element.value) return element.value;
    
    // Se for um elemento com placeholder
    if (element.placeholder && element.textContent.trim() === '') {
      return element.placeholder;
    }
    
    // Texto normal
    return element.textContent || element.innerText || '';
  }

  // Extrai todos os dados do card atual
  extractCardData() {
    const title = this.extractTitle();
    const content = this.extractContent();
    const properties = this.extractProperties();
    
    if (!title) {
      return null;
    }
    
    const cardData = {
      title,
      content,
      properties,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
    
    this.currentCardData = cardData;
    
    return cardData;
  }

  // Observa mudanças na página para detectar novos cards
  observeChanges() {
    const observer = new MutationObserver((mutations) => {
      // Verificar se houve mudanças significativas na página
      const hasSignificantChanges = mutations.some(mutation => {
        return mutation.addedNodes.length > 0 || 
               mutation.removedNodes.length > 0 ||
               (mutation.target && mutation.target.textContent);
      });
      
      if (hasSignificantChanges) {
        // Debounce: esperar 500ms após a última mudança
        clearTimeout(this.extractTimeout);
        this.extractTimeout = setTimeout(() => {
          this.extractCardData();
        }, 500);
      }
    });

    // Observar mudanças no body
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Extract initial data
    setTimeout(() => {
      this.extractCardData();
    }, 1000);
  }

  // Configura listener para mensagens do popup/background
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      
      // Basic message validation
      if (!message || !message.action) {
        console.error('❌ Mensagem inválida recebida');
        sendResponse({ success: false, error: 'Mensagem inválida' });
        return true;
      }
      
      try {
        switch (message.action) {
          case 'getCardData':
            const data = this.extractCardData();
            const response = { 
              success: !!data, 
              data: data,
              error: data ? null : 'Nenhum card detectado no Notion',
              timestamp: new Date().toISOString()
            };
            sendResponse(response);
            break;
            
          case 'isNotionPage':
            const isNotion = this.isValidNotionPage();
            const pageResponse = { 
              success: true, 
              isNotion: isNotion,
              url: window.location.href,
              hostname: window.location.hostname,
              pathname: window.location.pathname,
              timestamp: new Date().toISOString()
            };
            sendResponse(pageResponse);
            break;
            
          default:
            console.warn('⚠️ Unknown action:', message.action);
            sendResponse({ success: false, error: 'Unknown action: ' + message.action });
        }
      } catch (error) {
        console.error('❌ Erro no content script:', error);
        sendResponse({ 
          success: false, 
          error: 'Erro interno: ' + error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      return true; // Mantém o canal de resposta aberto
    });

    // Verificar se a conexão está funcionando
    
    // Notificar que o content script foi carregado
    try {
      chrome.runtime.sendMessage({
        action: 'contentScriptLoaded',
        url: window.location.href,
        timestamp: new Date().toISOString()
      }).catch(error => {
        console.warn('⚠️ Não foi possível notificar background script:', error);
      });
    } catch (error) {
      console.warn('⚠️ Runtime não disponível ainda:', error);
    }
  }
}

// Inicializar o extrator quando a página estiver pronta
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new NotionCardExtractor();
  });
} else {
  new NotionCardExtractor();
}
