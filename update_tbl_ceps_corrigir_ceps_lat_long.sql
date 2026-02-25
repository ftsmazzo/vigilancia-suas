-- Corrige CEP, lat_char e long_char na tbl_ceps (identificação por endereço e bairro).
-- CEPs estavam errados; este script atualiza para os valores corretos da planilha.

UPDATE public.tbl_ceps SET cep = '14070249', lat_char = '-21.117860', long_char = '-47.795949' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Doutor Dante Jema' AND TRIM(COALESCE(bairro, '')) = 'Quintino Facci II';
UPDATE public.tbl_ceps SET cep = '14062000', lat_char = '-21.115110', long_char = '-47.811265' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Professor Takashi Eskimó' AND TRIM(COALESCE(bairro, '')) = 'Jardim Heitor Rigon';
UPDATE public.tbl_ceps SET cep = '14093637', lat_char = '-21.162953', long_char = '-47.728861' WHERE TRIM(COALESCE(endereco, '')) = 'Rua José Margato' AND TRIM(COALESCE(bairro, '')) = 'Parque dos Flamboyans';
UPDATE public.tbl_ceps SET cep = '14056850', lat_char = '-21.154566', long_char = '-47.842181' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Francisco Ferriolli' AND TRIM(COALESCE(bairro, '')) = 'Jardim Paiva';
UPDATE public.tbl_ceps SET cep = '14093651', lat_char = '-21.168162', long_char = '-47.728837' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Leonor Pennachiotti Gallo' AND TRIM(COALESCE(bairro, '')) = 'Parque dos Flamboyans';
UPDATE public.tbl_ceps SET cep = '14070460', lat_char = '-21.108242', long_char = '-47.792974' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Ignês Mantovani Giachetto' AND TRIM(COALESCE(bairro, '')) = 'Quintino Facci II';
UPDATE public.tbl_ceps SET cep = '14056641', lat_char = '-21.141334', long_char = '-47.853178' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Philomena Zunfrili Castelucci' AND TRIM(COALESCE(bairro, '')) = 'Portal do Alto';
UPDATE public.tbl_ceps SET cep = '14093586', lat_char = '-21.118370', long_char = '-47.810099' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Carlos Marighella' AND TRIM(COALESCE(bairro, '')) = 'Parque Residencial Cândido Portinari';
UPDATE public.tbl_ceps SET cep = '14092480', lat_char = '-21.218584', long_char = '-47.784708' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Armando Sicci' AND TRIM(COALESCE(bairro, '')) = 'Residencial e Comercial Palmares';
UPDATE public.tbl_ceps SET cep = '14078705', lat_char = '-21.118035', long_char = '-47.814639' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Adilson Bignardi' AND TRIM(COALESCE(bairro, '')) = 'Jardim Patriarca';
UPDATE public.tbl_ceps SET cep = '14061690', lat_char = '-21.166477', long_char = '-47.746077' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Mansueto Bonaccorsi' AND TRIM(COALESCE(bairro, '')) = 'Valentina Figueiredo';
UPDATE public.tbl_ceps SET cep = '14021370', lat_char = '-21.110488', long_char = '-47.786520' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Orlando Palocci' AND TRIM(COALESCE(bairro, '')) = 'City Ribeirão';
UPDATE public.tbl_ceps SET cep = '14062022', lat_char = '-21.182267', long_char = '-47.866511' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Rosalina da Cunha Fontanezi' AND TRIM(COALESCE(bairro, '')) = 'Jardim Heitor Rigon';
UPDATE public.tbl_ceps SET cep = '14093561', lat_char = '-21.202196', long_char = '-47.776550' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Irene Capucci de Oliveira' AND TRIM(COALESCE(bairro, '')) = 'Parque Residencial Cândido Portinari';
UPDATE public.tbl_ceps SET cep = '14070710', lat_char = '-21.120808', long_char = '-47.816775' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Vereador Romero Barbosa' AND TRIM(COALESCE(bairro, '')) = 'Avelino Alves Palma';
UPDATE public.tbl_ceps SET cep = '14040623', lat_char = '-21.218242', long_char = '-47.781280' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Virgínia Biagi Luchiari' AND TRIM(COALESCE(bairro, '')) = 'Jardim Itaú';
UPDATE public.tbl_ceps SET cep = '14096450', lat_char = '-21.117860', long_char = '-47.795949' WHERE TRIM(COALESCE(endereco, '')) = 'Avenida Talita Regazzini Verçosa' AND TRIM(COALESCE(bairro, '')) = 'Ribeirânia';
UPDATE public.tbl_ceps SET cep = '14062380', lat_char = '-21.115110', long_char = '-47.811265' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Professora Irma Cury Ribeiro da Silva' AND TRIM(COALESCE(bairro, '')) = 'Jardim Maria de Lourdes';
UPDATE public.tbl_ceps SET cep = '14021260', lat_char = '-21.162953', long_char = '-47.728861' WHERE TRIM(COALESCE(endereco, '')) = 'Rua João Castellucci' AND TRIM(COALESCE(bairro, '')) = 'City Ribeirão';
UPDATE public.tbl_ceps SET cep = '14075814', lat_char = '-21.127854', long_char = '-47.801210' WHERE TRIM(COALESCE(endereco, '')) = 'Estrada Vicente Canuto' AND TRIM(COALESCE(bairro, '')) = 'Chácaras Pedro Corrêa de Carvalho';
UPDATE public.tbl_ceps SET cep = '14070249', lat_char = '-21.120330', long_char = '-47.838584' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Dorival Falconi' AND TRIM(COALESCE(bairro, '')) = 'Parque das Oliveiras';
UPDATE public.tbl_ceps SET cep = '14062000', lat_char = '-21.119191', long_char = '-47.818171' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Elvira Amador Biasoli' AND TRIM(COALESCE(bairro, '')) = 'Antônio Marincek';
UPDATE public.tbl_ceps SET cep = '14093637', lat_char = '-21.132591', long_char = '-47.851415' WHERE TRIM(COALESCE(endereco, '')) = 'Rua Euclydes Augusto Carneiro' AND TRIM(COALESCE(bairro, '')) = 'Jardim Jovino Campos';
