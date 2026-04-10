figma.showUI(__html__, { width: 422, height: 680 });

let placeholderNode = null;

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create-placeholder') {
    const w = msg.width || 512;
    const h = msg.height || 512;
    const node = figma.createRectangle();
    node.resize(w, h);
    const vp = figma.viewport.center;
    node.x = vp.x - w / 2;
    node.y = vp.y - h / 2;
    node.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.12 } }];
    node.cornerRadius = 16;
    node.name = msg.name || 'Stiletto — генерация...';
    figma.currentPage.appendChild(node);
    figma.currentPage.selection = [node];
    figma.viewport.scrollAndZoomIntoView([node]);
    placeholderNode = node;
    figma.ui.postMessage({ type: 'placeholder-created' });
  }

  if (msg.type === 'fill-placeholder') {
    const imageBytes = figma.base64Decode(msg.data);
    const image = figma.createImage(imageBytes);
    if (placeholderNode) {
      placeholderNode.cornerRadius = 0;
      placeholderNode.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
      placeholderNode.name = msg.name || 'Stiletto Generation';
      figma.currentPage.selection = [placeholderNode];
      figma.viewport.scrollAndZoomIntoView([placeholderNode]);
      placeholderNode = null;
    }
    figma.ui.postMessage({ type: 'image-inserted' });
  }

  if (msg.type === 'remove-placeholder') {
    if (placeholderNode) {
      placeholderNode.remove();
      placeholderNode = null;
    }
  }

  if (msg.type === 'insert-image') {
    const imageBytes = figma.base64Decode(msg.data);
    const image = figma.createImage(imageBytes);
    const node = figma.createRectangle();
    const w = msg.width || 512;
    const h = msg.height || 512;
    node.resize(w, h);
    const vp = figma.viewport.center;
    node.x = vp.x - w / 2;
    node.y = vp.y - h / 2;
    node.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
    node.name = msg.name || 'Stiletto Generation';
    figma.currentPage.appendChild(node);
    figma.currentPage.selection = [node];
    figma.viewport.scrollAndZoomIntoView([node]);
    figma.ui.postMessage({ type: 'image-inserted' });
  }

  if (msg.type === 'notify') {
    figma.notify(msg.message);
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
};
