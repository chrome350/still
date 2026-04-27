figma.showUI(__html__, { width: 422, height: 680 });

let placeholderNode = null;
let placeholderCreatedByPlugin = false;
const AUTH_STORAGE_KEY = 'stiletto_auth_v1';

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create-placeholder') {
    const selection = figma.currentPage.selection;
    const selectedFrame = selection.length === 1 &&
      (selection[0].type === 'FRAME' || selection[0].type === 'COMPONENT' || selection[0].type === 'INSTANCE')
      ? selection[0] : null;

    if (selectedFrame) {
      placeholderNode = selectedFrame;
      placeholderCreatedByPlugin = false;
    } else {
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
      placeholderNode = node;
      placeholderCreatedByPlugin = true;
    }
    figma.ui.postMessage({ type: 'placeholder-created' });
  }

  if (msg.type === 'fill-placeholder') {
    const image = figma.createImage(msg.bytes);
    if (placeholderNode) {
      if (placeholderCreatedByPlugin) placeholderNode.cornerRadius = 0;
      placeholderNode.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
      placeholderNode.name = msg.name || 'Stiletto Generation';
      figma.currentPage.selection = [placeholderNode];
      placeholderNode = null;
      placeholderCreatedByPlugin = false;
    }
    figma.ui.postMessage({ type: 'image-inserted' });
  }

  if (msg.type === 'remove-placeholder') {
    if (placeholderNode && placeholderCreatedByPlugin) {
      placeholderNode.remove();
    }
    placeholderNode = null;
    placeholderCreatedByPlugin = false;
  }

  if (msg.type === 'insert-image') {
    const image = figma.createImage(msg.bytes);
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
    figma.ui.postMessage({ type: 'image-inserted' });
  }

  if (msg.type === 'notify') {
    figma.notify(msg.message);
  }

  if (msg.type === 'auth:get') {
    const auth = await figma.clientStorage.getAsync(AUTH_STORAGE_KEY);
    figma.ui.postMessage({ type: 'auth:state', auth: auth || null });
  }

  if (msg.type === 'auth:save') {
    await figma.clientStorage.setAsync(AUTH_STORAGE_KEY, msg.auth || null);
    figma.ui.postMessage({ type: 'auth:saved' });
  }

  if (msg.type === 'auth:clear') {
    await figma.clientStorage.deleteAsync(AUTH_STORAGE_KEY);
    figma.ui.postMessage({ type: 'auth:cleared' });
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
};
