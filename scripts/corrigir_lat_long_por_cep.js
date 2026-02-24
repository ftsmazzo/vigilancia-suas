/**
 * Corrige lat/long usando AwesomeAPI por CEP.
 * Uso: node scripts/corrigir_lat_long_por_cep.js
 * Gera: correcao_lat_long.csv e update_tbl_ceps_lat_long.sql
 */

const fs = require('fs');
const path = require('path');

const AWESOME_API = 'https://cep.awesomeapi.com.br/json';
const DELAY_MS = 200;

// Dados colados: endereço \t bairro \t cep \t lat \t long
const dadosBrutos = `Rua Professor Antônio Baracchini	Jardim São Luiz	14020390	-21.1704008	-47.8103238
Rua João Castellucci	City Ribeirão	14020391	-21.1704008	-47.8103238
Rua Orlando Palocci	City Ribeirão	14020392	-21.1704008	-47.8103238
Praça Comendador Manuel dos Santos Freire	Vila Virgínia	14020393	-21.1704008	-47.8103238
Travessa Inhomirim	Vila Virgínia	14020394	-21.1704008	-47.8103238
Praça João Batista Ferreira	Jardim Piratininga	14020395	-21.1704008	-47.8103238
Rua Ronald de Carvalho	Jardim Bela Vista	14020396	-21.1704008	-47.8103238
Rua Jan Janowski	Jardim Marchesi	14020397	-21.1704008	-47.8103238
Rua Deolinda Zunfrilli	Núcleo Vida Nova	14020398	-21.1704008	-47.8103238
Rua João Thomazo	Jardim Marchesi	14020399	-21.1704008	-47.8103238
Rua Nadin Latuf	Jardim Dona Branca Salles	14020400	-21.1704008	-47.8103238
Rua Edith Augusto Rezende	Jardim Dona Branca Salles	14020401	-21.1704008	-47.8103238
Avenida Frei Tito de Alencar Lima	Jardim Dona Branca Salles	14020402	-21.1704008	-47.8103238
Rua Gilberto Spagnol	Jardim Dona Branca Salles	14020403	-21.1704008	-47.8103238
Avenida Maestro Antônio Giammarusti	Jardim Itaú	14020404	-21.1704008	-47.8103238
Rua Virgínia Biagi Luchiari	Jardim Itaú	14020405	-21.1704008	-47.8103238
Travessa João Mazzei	Ipiranga	14020406	-21.1704008	-47.8103238
Rua Aurora Maria Caravello Lopes	Planalto Verde	14020407	-21.1704008	-47.8103238
Rua Ministro Gustavo Capanema de Almeida	Planalto Verde	14020408	-21.1704008	-47.8103238
Rua Waldyr Castaldelli	Planalto Verde	14020409	-21.1704008	-47.8103238
Rua Philomena Zunfrili Castellucci	Portal do Alto	14020410	-21.1704008	-47.8103238
Rua Jacinto Giubelini	Jardim Doutor Paulo Gomes Romeo	14020411	-21.1704008	-47.8103238
Rua Beth Lima	Jardim Paiva	14020412	-21.1704008	-47.8103238
Rua Francisco Ferriolli	Jardim Paiva	14020413	-21.1704008	-47.8103238
Rua Walter Ziliotto	Jardim Paiva	14020414	-21.1704008	-47.8103238
Rua Dona Yolanda Baptista Orsi	Jardim Paiva	14020415	-21.1704008	-47.8103238
Rua Cláudio Protti	Parque das Andorinhas	14020416	-21.1704008	-47.8103238
Rua Euclydes Augusto Carneiro	Jardim Jovino Campos	14020417	-21.1704008	-47.8103238
Rua Wadyh William Cury	Dom Bernardo José Mielle	14020418	-21.1704008	-47.8103238
Rua Professor Doutor André Ricciardi Cruz	Jardim Eugênio Mendes Lopes	14020419	-21.1704008	-47.8103238
Rua Diego de Carvalho	Residencial Doutor Rubem Cione	14020420	-21.1704008	-47.8103238
Rua Armando Greggi	Conjunto Habitacional Sílvio Passalacqua	14020421	-21.1704008	-47.8103238
Rua Francisco Fernandes Lamas	Conjunto Habitacional Sílvio Passalacqua	14020422	-21.1704008	-47.8103238
Rua Alcides Millan	Conjunto Habitacional Sílvio Passalacqua	14020423	-21.1704008	-47.8103238
Rua Armando de Oliveira Vallada	Antônio Marincek	14020424	-21.1704008	-47.8103238
Rua Nathanael Emerich	Antônio Marincek	14020425	-21.1704008	-47.8103238
Rua Antônio Rossanese	Chácaras Bonacorsi	14020426	-21.1704008	-47.8103238
Rua Mansueto Bonaccorsi	Valentina Figueiredo	14020427	-21.1704008	-47.8103238
Rua Professor Takashi Shimo	Jardim Heitor Rigon	14020428	-21.1704008	-47.8103238
Rua Rosalina da Cunha Fontanezi	Jardim Heitor Rigon	14020429	-21.1704008	-47.8103238
Rua Marcelo Rodrigues Agostinho	Jardim Heitor Rigon	14020430	-21.1704008	-47.8103238
Rua Carolina Veronezi Mingarino	Jardim Heitor Rigon	14020431	-21.1704008	-47.8103238
Rua Adylio Mosca	Jardim Heitor Rigon	14020432	-21.1704008	-47.8103238
Rua Antônia Quaresma da Silveira Minto	Jardim Heitor Rigon	14020433	-21.1704008	-47.8103238
Avenida Esthevão Nomelini	Parque dos Pinus	14020434	-21.1704008	-47.8103238
Rua Renato Bulgarelli	Parque dos Pinus	14020435	-21.1704008	-47.8103238
Rua Luiza Maria Tognon Perticarrari	Parque dos Pinus	14020436	-21.1704008	-47.8103238
Rua Dona Maria Giubelini Scandiuzzi	Jardim Maria de Lourdes	14020437	-21.1704008	-47.8103238
Rua Professor Takashi Shimo	Jardim Maria de Lourdes	14020438	-21.1704008	-47.8103238
Rua Professora Irma Cury Ribeiro da Silva	Jardim Maria de Lourdes	14020439	-21.1704008	-47.8103238
Rua João Mattaraia	Jardim Joaquim Procópio de Araújo Ferraz	14020440	-21.1704008	-47.8103238
Rua Professor Antônio Robazzi	Jardim Joaquim Procópio de Araújo Ferraz	14020441	-21.1704008	-47.8103238
Rua Coronel Chead Abdalla	Jardim Joaquim Procópio de Araújo Ferraz	14020442	-21.1704008	-47.8103238
Rua Benedicto Thomaz Terreri	Parque das Figueiras	14020443	-21.1704008	-47.8103238
Rua Alfredo Tiezzi	Parque das Figueiras	14020444	-21.1704008	-47.8103238
Avenida Arsênio Sacilotto	Parque das Oliveiras	14020445	-21.1704008	-47.8103238
Rua Manoel Navarro	Parque das Oliveiras	14020446	-21.1704008	-47.8103238
Rua Dorival Falconi	Parque das Oliveiras	14020447	-21.1704008	-47.8103238
Rua Adelaide Sumarelli dos Santos	Parque das Oliveiras	14020448	-21.1704008	-47.8103238
Rua Benedita Melo da Silva	Parque das Oliveiras	14020449	-21.1704008	-47.8103238
Rua Luiz Fabiano Anholetto	Parque das Oliveiras	14020450	-21.1704008	-47.8103238
Rua Renato Camperoni	Parque das Oliveiras	14020451	-21.1704008	-47.8103238
Rua Maria Ribeiro Miotto	Parque das Oliveiras	14020452	-21.1704008	-47.8103238
Rua João Tapetti	Jardim Alexandre Balbo	14020453	-21.1704008	-47.8103238
Rua Hugo Carletti	Jardim Alexandre Balbo	14020454	-21.1704008	-47.8103238
Rua Dozolina Mafalda Bertocco Reis	Jardim Orestes Lopes de Camargo	14020455	-21.1704008	-47.8103238
Rua Doutor Dante Jemma	Quintino Facci II	14020456	-21.1704008	-47.8103238
Rua Osmar Vecchi	Quintino Facci II	14020457	-21.1704008	-47.8103238
Rua João Gagliardi	Quintino Facci II	14020458	-21.1704008	-47.8103238
Rua Ignês Mantovani Giachetto	Quintino Facci II	14020459	-21.1704008	-47.8103238
Rua Francisco Bassotelli	Quintino Facci II	14020460	-21.1704008	-47.8103238
Rua Vereador Romero Barbosa	Avelino Alves Palma	14020461	-21.1704008	-47.8103238
Rua Maria Aparecida de Souza Diniz Guimarães	Condomínio Balneário Recreativa	14020462	-21.1704008	-47.8103238
Estrada Doutor Oswaldo Ruiz	Chácaras Pedro Corrêa de Carvalho	14020463	-21.1704008	-47.8103238
Estrada Vereador Antônio Joaquim da Silva	Chácaras Pedro Corrêa de Carvalho	14020464	-21.1704008	-47.8103238
Estrada Vicente Canuto	Chácaras Pedro Corrêa de Carvalho	14020465	-21.1704008	-47.8103238
Estrada Vereador João Francisco de Oliveira	Chácaras Pedro Corrêa de Carvalho	14020466	-21.1704008	-47.8103238
Rua Luiz Roberto Mesquita Leão	Independência	14020467	-21.1704008	-47.8103238
Rua Doutor Horácio Montenegro	Independência	14020468	-21.1704008	-47.8103238
Rua Antônio Mazzafelli	Quintino Facci I	14020469	-21.1704008	-47.8103238
Rua Humberto Felloni	Parque Industrial Avelino Alves Palma	14020470	-21.1704008	-47.8103238
Rua Maria Luiza da Silva Prado Ramos	Parque Industrial Avelino Alves Palma	14020471	-21.1704008	-47.8103238
Rua Londrina	Jardim Salgado Filho	14020472	-21.1704008	-47.8103238
Rua Adilson Bignardi	Jardim Patriarca	14020473	-21.1704008	-47.8103238
Rua Major-Brigadeiro-do-Ar Josino Maia de Assis	Cidade Jardim	14020474	-21.1704008	-47.8103238
Rua Genny Arantes Vianna Cione	Residencial Léo Gomes de Moraes	14020475	-21.1704008	-47.8103238
Rua Henrique Santillo	Jardim Professor Antônio Palocci	14020476	-21.1704008	-47.8103238
Rua Emílio José Campos	Jardim Professor Antônio Palocci	14020477	-21.1704008	-47.8103238
Rua Olinda Ribeiro Waldemar	Jardim Professor Antônio Palocci	14020478	-21.1704008	-47.8103238
Rua Angelino Vendrúsculo	Jardim Professor Antônio Palocci	14020479	-21.1704008	-47.8103238
Rua Pedro Matiuzzo	Jardim Professor Antônio Palocci	14020480	-21.1704008	-47.8103238
Rua Ademir Spagnol Miluzzi	Jardim Diva Tarlá de Carvalho	14020481	-21.1704008	-47.8103238
Rua Paulo Cesar Rodrigues	Jardim Vilico Cantarelli	14020482	-21.1704008	-47.8103238
Rua Breno Nogueira	Jardim Vilico Cantarelli	14020483	-21.1704008	-47.8103238
Rua Daudt José da Costa	Jardim Pedra Branca	14020484	-21.1704008	-47.8103238
Rua Senador Darcy Ribeiro	Jardim Porto Seguro	14020485	-21.1704008	-47.8103238
Rua Selma Marina Barrela dos Santos	Jardim Ouro Branco	14020486	-21.1704008	-47.8103238
Travessa Vanderci Mattiusso	Jardim Paulistano	14020487	-21.1704008	-47.8103238
Rua Jair Grellet	Jardim Castelo Branco	14020488	-21.1704008	-47.8103238
Rua Ângelo Parmigiani	Iguatemi	14020489	-21.1704008	-47.8103238`;

function parseLinhas(texto) {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = l.split('\t');
      const endereco = (parts[0] || '').trim();
      const bairro = (parts[1] || '').trim();
      const cep = (parts[2] || '').replace(/\D/g, '').slice(0, 8);
      return { endereco, bairro, cep };
    });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function buscarLatLngCep(cep) {
  if (!cep || cep.length < 8) return null;
  try {
    const res = await fetch(`${AWESOME_API}/${cep}`);
    if (!res.ok) return null;
    const data = await res.json();
    const lat = data?.lat != null ? String(data.lat) : null;
    const lng = data?.lng != null ? String(data.lng) : null;
    return lat != null && lng != null ? { lat, lng } : null;
  } catch {
    return null;
  }
}

/** Nominatim: 1 req/sec. q = endereço, bairro, Ribeirão Preto, Brasil */
async function buscarLatLngEndereco(endereco, bairro) {
  const q = [endereco, bairro, 'Ribeirão Preto', 'SP', 'Brasil'].filter(Boolean).join(', ');
  if (!q || q.length < 10) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=br`;
    const res = await fetch(url, { headers: { 'User-Agent': 'VigilanciaCEPs/1.0' } });
    if (!res.ok) return null;
    const arr = await res.json();
    const first = arr?.[0];
    const lat = first?.lat;
    const lng = first?.lon;
    return lat != null && lng != null ? { lat: String(lat), lng: String(lng) } : null;
  } catch {
    return null;
  }
}

function escapeCsv(val) {
  const s = String(val ?? '');
  if (/[;"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function escapeSql(val) {
  if (val == null || val === '') return 'NULL';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

async function main() {
  const linhas = parseLinhas(dadosBrutos);
  const cepsUnicos = [...new Set(linhas.map((r) => r.cep).filter(Boolean))];
  console.log(`Linhas: ${linhas.length}, CEPs únicos: ${cepsUnicos.length}`);

  const cacheCep = {};
  for (let i = 0; i < cepsUnicos.length; i++) {
    const cep = cepsUnicos[i];
    const coords = await buscarLatLngCep(cep);
    cacheCep[cep] = coords;
    if ((i + 1) % 10 === 0) console.log(`  CEPs (AwesomeAPI): ${i + 1}/${cepsUnicos.length}`);
    await sleep(DELAY_MS);
  }

  let corrigidos = linhas.map((r) => {
    const coords = cacheCep[r.cep] || null;
    return {
      endereco: r.endereco,
      bairro: r.bairro,
      cep: r.cep,
      lat: coords ? coords.lat : '',
      lng: coords ? coords.lng : '',
    };
  });

  const semCoords = corrigidos.filter((r) => !r.lat || !r.lng);
  if (semCoords.length > 0) {
    console.log(`  Tentando Nominatim por endereço para ${semCoords.length} linhas (1 req/s)...`);
    for (let i = 0; i < semCoords.length; i++) {
      const r = semCoords[i];
      const coords = await buscarLatLngEndereco(r.endereco, r.bairro);
      if (coords) {
        const idx = corrigidos.findIndex((x) => x.cep === r.cep && x.endereco === r.endereco);
        if (idx >= 0) {
          corrigidos[idx] = { ...corrigidos[idx], lat: coords.lat, lng: coords.lng };
        }
      }
      await sleep(1100);
      if ((i + 1) % 10 === 0) console.log(`  Nominatim: ${i + 1}/${semCoords.length}`);
    }
  }

  const dir = path.join(__dirname, '..');
  const csvLines = ['endereco;bairro;cep;lat;lng'];
  corrigidos.forEach((r) => {
    csvLines.push([r.endereco, r.bairro, r.cep, r.lat, r.lng].map(escapeCsv).join(';'));
  });
  const csvPath = path.join(dir, 'correcao_lat_long.csv');
  fs.writeFileSync(csvPath, '\ufeff' + csvLines.join('\r\n'), 'utf8');
  console.log('Gerado:', csvPath);

  const sqlLines = [
    '-- Atualiza tbl_ceps com lat_char e long_char corretos (AwesomeAPI + Nominatim)',
    '-- UPDATE por CEP e endereço para preservar coordenadas por logradouro quando vieram do Nominatim.',
    '',
  ];
  corrigidos.forEach((r) => {
    if (r.lat && r.lng && r.cep) {
      sqlLines.push(
        `UPDATE public.tbl_ceps SET lat_char = ${escapeSql(r.lat)}, long_char = ${escapeSql(r.lng)} WHERE TRIM(REPLACE(REPLACE(COALESCE(cep, ''), '-', ''), ' ', '')) = ${escapeSql(r.cep)} AND TRIM(COALESCE(endereco, '')) = ${escapeSql(r.endereco)};`
      );
    }
  });
  const sqlPath = path.join(dir, 'update_tbl_ceps_lat_long.sql');
  fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf8');
  console.log('Gerado:', sqlPath);

  const comCoords = corrigidos.filter((r) => r.lat && r.lng).length;
  console.log(`Resumo: ${comCoords}/${corrigidos.length} linhas com lat/long obtidos.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
