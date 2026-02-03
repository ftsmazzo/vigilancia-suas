// =============================================================================
// N8N Code: Extração Cabeçalho (use nos 3 workflows SIBEC)
// Mesmo padrão do CADU validado: extrai cabeçalho e repassa o arquivo (binary).
// Única diferença: CSV SIBEC usa VÍRGULA (,) como delimitador (CADU usa ;).
// Usa prepareBinaryData() do n8n para saída binary (evita loop/travamento).
// =============================================================================

const item = $input.first();

if (!item.binary || Object.keys(item.binary).length === 0) {
  throw new Error('Nenhum arquivo recebido. Verifique o campo "Insira o CSV" no Form.');
}

const binaryKey = Object.keys(item.binary)[0];
const buffer = await this.helpers.getBinaryDataBuffer(0, binaryKey);
const content = buffer.toString('utf-8');

const firstLine = content.split(/\r?\n/)[0];
if (!firstLine) {
  throw new Error('CSV vazio ou sem cabeçalho.');
}

// SIBEC: delimitador é VÍRGULA (não ponto e vírgula como no CADU)
const headersOriginal = firstLine.split(',').map(h => h.trim());
const headers = headersOriginal.map(h => h.replace(/\./g, '_'));

const fileName = item.binary[binaryKey].fileName || 'data.csv';

// Helper oficial do n8n: prepara o buffer para saída binary (evita loop)
const binaryData = await this.helpers.prepareBinaryData(buffer, fileName);

return [{
  json: {
    headers,
    headersOriginal,
    colCount: headers.length
  },
  binary: {
    data: binaryData
  }
}];
