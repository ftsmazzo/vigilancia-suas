// N8N Code node: extrai só o cabeçalho do CSV enviado pelo Form
// Conecte este nó após o Form Trigger "Cadastro Único"
// Saída: { headers, headersOriginal, colCount } para o próximo nó usar no CREATE/INSERT

const item = $input.first();

if (!item.binary || Object.keys(item.binary).length === 0) {
  throw new Error('Nenhum arquivo recebido. Verifique o campo "Insira o CSV" no Form.');
}

// Pega o primeiro (e geralmente único) binário do item (arquivo do form)
const binaryKey = Object.keys(item.binary)[0];
const buffer = await this.helpers.getBinaryDataBuffer(0, binaryKey);
const content = buffer.toString('utf-8');

// Lê só a primeira linha (cabeçalho)
const firstLine = content.split(/\r?\n/)[0];
if (!firstLine) {
  throw new Error('CSV vazio ou sem cabeçalho.');
}

// Delimitador do CADU é ponto e vírgula
const headersOriginal = firstLine.split(';').map(h => h.trim());
// Normaliza para nomes de coluna no banco: d.campo -> d_campo, p.campo -> p_campo
const headers = headersOriginal.map(h => h.replace(/\./g, '_'));

return [{
  json: {
    headers,
    headersOriginal,
    colCount: headers.length
  }
}];
