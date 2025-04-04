import React, { useEffect, useState } from 'react';

/**
 * A simple custom markdown parser implementation
 */
function parseMarkdown(markdown) {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Headers (h1 through h6)
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
  html = html.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
  html = html.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
  
  // Alt syntax for h1, h2
  html = html.replace(/^(.+)\n=+$/gm, '<h1>$1</h1>');
  html = html.replace(/^(.+)\n-+$/gm, '<h2>$1</h2>');
  
  // Bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Images
  html = html.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  
  // Lists
  // This is a simplified approach - nested lists would need more complex parsing
  let inList = false;
  let listType = '';
  
  // Process line by line for lists
  const lines = html.split('\n');
  for (let i = 0; i < lines.length; i++) {
    // Unordered list
    if (lines[i].match(/^\s*[-*+]\s/)) {
      if (!inList) {
        lines[i] = '<ul>\n<li>' + lines[i].replace(/^\s*[-*+]\s/, '') + '</li>';
        inList = true;
        listType = 'ul';
      } else if (listType === 'ul') {
        lines[i] = '<li>' + lines[i].replace(/^\s*[-*+]\s/, '') + '</li>';
      } else {
        // Close the ordered list and start unordered
        lines[i] = '</ol>\n<ul>\n<li>' + lines[i].replace(/^\s*[-*+]\s/, '') + '</li>';
        listType = 'ul';
      }
    } 
    // Ordered list
    else if (lines[i].match(/^\s*\d+\.\s/)) {
      if (!inList) {
        lines[i] = '<ol>\n<li>' + lines[i].replace(/^\s*\d+\.\s/, '') + '</li>';
        inList = true;
        listType = 'ol';
      } else if (listType === 'ol') {
        lines[i] = '<li>' + lines[i].replace(/^\s*\d+\.\s/, '') + '</li>';
      } else {
        // Close the unordered list and start ordered
        lines[i] = '</ul>\n<ol>\n<li>' + lines[i].replace(/^\s*\d+\.\s/, '') + '</li>';
        listType = 'ol';
      }
    }
    // Not a list item, close any open list
    else if (inList && lines[i].trim() !== '') {
      lines[i] = (listType === 'ul' ? '</ul>' : '</ol>') + '\n' + lines[i];
      inList = false;
    }
  }
  
  // Close any open list at the end
  if (inList) {
    lines.push(listType === 'ul' ? '</ul>' : '</ol>');
  }
  
  html = lines.join('\n');
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Blockquotes
  let inQuote = false;
  const bqLines = html.split('\n');
  for (let i = 0; i < bqLines.length; i++) {
    if (bqLines[i].match(/^\s*>\s/)) {
      if (!inQuote) {
        bqLines[i] = '<blockquote>\n' + bqLines[i].replace(/^\s*>\s/, '');
        inQuote = true;
      } else {
        bqLines[i] = bqLines[i].replace(/^\s*>\s/, '');
      }
    } else if (inQuote && bqLines[i].trim() !== '') {
      bqLines[i] = '</blockquote>\n' + bqLines[i];
      inQuote = false;
    }
  }
  
  if (inQuote) {
    bqLines.push('</blockquote>');
  }
  
  html = bqLines.join('\n');
  
  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^\*\*\*$/gm, '<hr>');
  html = html.replace(/^___$/gm, '<hr>');
  
  // Paragraphs - wrap non-empty lines that aren't already in HTML tags
  const paragraphs = html.split('\n\n');
  for (let i = 0; i < paragraphs.length; i++) {
    if (
      paragraphs[i].trim() !== '' && 
      !paragraphs[i].trim().startsWith('<') && 
      !paragraphs[i].trim().endsWith('>')
    ) {
      paragraphs[i] = '<p>' + paragraphs[i] + '</p>';
    }
  }
  
  html = paragraphs.join('\n\n');
  
  return html;
}

function DocumentPreview({ content }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (content) {
      try {
        const parsedHtml = parseMarkdown(content);
        setHtml(parsedHtml);
      } catch (error) {
        console.error('Error parsing markdown:', error);
        setHtml('<p>Error rendering markdown</p>');
      }
    } else {
      setHtml('');
    }
  }, [content]);

  return (
    <div className="h-full overflow-auto bg-white">
      {content ? (
        <div 
          className="p-6 prose max-w-none"
          dangerouslySetInnerHTML={{ __html: html }} 
        />
      ) : (
        <div className="flex items-center justify-center h-full p-6 text-gray-400">
          <p>Your preview will appear here</p>
        </div>
      )}
    </div>
  );
}

export default DocumentPreview;