figma.showUI(__html__, { width: 422, height: 680 });

let placeholderNode = null;
const AUTH_STORAGE_KEY = 'stiletto_auth_v1';

function dataUrlToBytes(dataUrl) {
  const parts = String(dataUrl || '').split(',');
  if (parts.length !== 2) throw new Error('Invalid data URL');
  const meta = parts[0];
  const b64 = parts[1];
  const mimeMatch = meta.match(/^data:(.*);base64$/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bytes = figma.base64Decode(b64);
  return { bytes, mime };
}

function bytesToBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

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

  if (msg.type === 'api:request') {
    const requestId = msg.requestId;
    try {
      const method = msg.method || 'GET';
      const headers = msg.headers || {};
      const init = { method, headers };

      if (msg.bodyType === 'json') {
        init.headers = Object.assign({}, headers, { 'Content-Type': 'application/json' });
        init.body = JSON.stringify(msg.body || {});
      }

      if (msg.bodyType === 'multipart-image') {
        const form = new FormData();
        const parsed = dataUrlToBytes(msg.imageDataUrl);
        const blob = new Blob([parsed.bytes], { type: parsed.mime });
        const ext = parsed.mime.includes('jpeg') ? 'jpg' : 'png';
        form.append('image', blob, msg.filename || `upload.${ext}`);
        init.body = form;
      }

      const res = await fetch(msg.url, init);
      const responseHeaders = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let body = null;
      if (msg.responseType === 'arraybuffer') {
        const ab = await res.arrayBuffer();
        body = bytesToBase64(new Uint8Array(ab));
      } else {
        const text = await res.text();
        try {
          body = JSON.parse(text);
        } catch (parseError) {
          body = text;
        }
      }

      figma.ui.postMessage({
        type: 'api:response',
        requestId,
        ok: res.ok,
        status: res.status,
        headers: responseHeaders,
        body
      });
    } catch (e) {
      figma.ui.postMessage({
        type: 'api:response',
        requestId,
        ok: false,
        status: 0,
        error: e && e.message ? e.message : 'request failed'
      });
    }
  }
};
