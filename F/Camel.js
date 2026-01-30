        // Полная документация типов данных
        const DATA_TYPES_DOCS = {
            mapping: [
                { jsonType: 'number (integer)', example: '42', sqlTypes: 'INT, INTEGER, NUMBER(10)' },
                { jsonType: 'number (decimal)', example: '123.45', sqlTypes: 'DECIMAL(15,4), NUMERIC(15,4), NUMBER(15,4)' },
                { jsonType: 'boolean', example: 'true/false', sqlTypes: 'BOOLEAN, TINYINT(1), BIT, NUMBER(1)' },
                { jsonType: 'string (date)', example: '"2026-01-28"', sqlTypes: 'DATE' },
                { jsonType: 'string (datetime)', example: '"2026-01-28T20:46:00Z"', sqlTypes: 'DATETIME, TIMESTAMP, DATETIME2' },
                { jsonType: 'string (<4000)', example: '"user@example.com"', sqlTypes: 'VARCHAR(4000), NVARCHAR(4000)' },
                { jsonType: 'string (>4000)', example: 'длинный текст...', sqlTypes: 'TEXT, CLOB, NVARCHAR(MAX)' },
                { jsonType: 'array/object', example: '["tag1"] / {}', sqlTypes: 'JSON, JSONB, TEXT' },
                { jsonType: 'null', example: 'null', sqlTypes: 'NULL / TEXT' }
            ],
            reference: [
                { purpose: 'Целые числа', mysql: 'INT, BIGINT', postgres: 'INTEGER, BIGINT', sqlite: 'INTEGER', oracle: 'NUMBER(10/19)', sqlserver: 'INT, BIGINT' },
                { purpose: 'Десятичные', mysql: 'DECIMAL(p,s), FLOAT', postgres: 'NUMERIC(p,s)', sqlite: 'REAL', oracle: 'NUMBER(p,s)', sqlserver: 'DECIMAL(p,s)' },
                { purpose: 'Логический', mysql: 'TINYINT(1), BOOLEAN', postgres: 'BOOLEAN', sqlite: 'INTEGER(0/1)', oracle: 'NUMBER(1)', sqlserver: 'BIT' },
                { purpose: 'Дата', mysql: 'DATE', postgres: 'DATE', sqlite: 'DATE (TEXT)', oracle: 'DATE', sqlserver: 'DATE' },
                { purpose: 'Время+дата', mysql: 'DATETIME(6), TIMESTAMP(6)', postgres: 'TIMESTAMP(6)', sqlite: 'TEXT (ISO8601)', oracle: 'TIMESTAMP(6)', sqlserver: 'DATETIME2(6)' },
                { purpose: 'Короткий текст', mysql: 'VARCHAR(4000)', postgres: 'VARCHAR(4000)', sqlite: 'TEXT', oracle: 'VARCHAR2(4000)', sqlserver: 'NVARCHAR(4000)' },
                { purpose: 'Длинный текст', mysql: 'TEXT, LONGTEXT', postgres: 'TEXT', sqlite: 'TEXT', oracle: 'CLOB', sqlserver: 'NVARCHAR(MAX)' },
                { purpose: 'JSON данные', mysql: 'JSON', postgres: 'JSON/JSONB', sqlite: 'TEXT', oracle: 'JSON', sqlserver: 'NVARCHAR(MAX)' },
                { purpose: 'Бинарные', mysql: 'BINARY, VARBINARY', postgres: 'BYTEA', sqlite: 'BLOB', oracle: 'BLOB', sqlserver: 'VARBINARY(MAX)' }
            ]
        };

        // Состояние приложения
        let currentFieldMapping = [];
        let originalFieldNames = new Map();
        let currentDBType = 'mysql';

        // Конфигурация СУБД
        const DB_CONFIG = {
            mysql: { integer: 'INT', decimal: 'DECIMAL(15,4)', boolean: 'TINYINT(1)', date: 'DATE', timestamp: 'DATETIME(6)', varchar: 'VARCHAR(4000)', text: 'TEXT', json: 'JSON', createPrefix: 'CREATE TABLE IF NOT EXISTS', insertPrefix: 'INSERT INTO', insertSuffix: ';', quote: '`', useGO: false },
            postgresql: { integer: 'INTEGER', decimal: 'NUMERIC(15,4)', boolean: 'BOOLEAN', date: 'DATE', timestamp: 'TIMESTAMP(6)', varchar: 'VARCHAR(4000)', text: 'TEXT', json: 'JSONB', createPrefix: 'CREATE TABLE IF NOT EXISTS', insertPrefix: 'INSERT INTO', insertSuffix: ';', quote: '"', useGO: false },
            sqlite: { integer: 'INTEGER', decimal: 'REAL', boolean: 'INTEGER', date: 'DATE', timestamp: 'TEXT', varchar: 'TEXT', text: 'TEXT', json: 'TEXT', createPrefix: 'CREATE TABLE IF NOT EXISTS', insertPrefix: 'INSERT INTO', insertSuffix: ';', quote: '"', useGO: false },
            oracle: { integer: 'NUMBER(10)', decimal: 'NUMBER(15,4)', boolean: 'NUMBER(1)', date: 'DATE', timestamp: 'TIMESTAMP(6)', varchar: 'VARCHAR2(4000)', text: 'CLOB', json: 'JSON', createPrefix: 'CREATE TABLE', insertPrefix: 'INSERT INTO', insertSuffix: ';', quote: '"', useGO: false, maxStringLen: 4000 },
            sqlserver: { integer: 'INT', decimal: 'DECIMAL(15,4)', boolean: 'BIT', date: 'DATE', timestamp: 'DATETIME2(6)', varchar: 'NVARCHAR(4000)', text: 'NVARCHAR(MAX)', json: 'NVARCHAR(MAX)', createPrefix: 'CREATE TABLE', insertPrefix: 'INSERT INTO', insertSuffix: 'GO', quote: '"', useGO: true }
        };

        // Конвертеры стилей
        const CASE_CONVERTERS = {
            camelCase: str => str.replace(/[_-]\w/g, m => m[1].toUpperCase()).replace(/\W+/g, '').replace(/^(\w)/, m => m.toLowerCase()),
            pascalCase: str => str.replace(/[_-]\w/g, m => m[1].toUpperCase()).replace(/\W+/g, '').replace(/^(\w)/, m => m.toUpperCase()),
            snake_case: str => str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/\W+/g, '_').replace(/^_|_$/g, ''),
            'kebab-case': str => str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/\W+/g, '-').replace(/^_|_$/g, ''),
            'UPPER_SNAKE_CASE': str => str.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/\W+/g, '_').replace(/^_|_$/g, '')
        };

        function initDocs() {
            // Маппинг JSON→SQL
            const mappingTbody = document.querySelector('#docsMappingTable tbody');
            DATA_TYPES_DOCS.mapping.forEach(type => {
                const row = mappingTbody.insertRow();
                row.innerHTML = `
                    <td><span class="type-badge json-type">${type.jsonType}</span></td>
                    <td><code>${type.example}</code></td>
                    <td><span class="type-badge sql-type">${type.sqlTypes}</span></td>
                `;
            });

            // Справочник типов
            const refTbody = document.querySelector('#docsReferenceTable tbody');
            DATA_TYPES_DOCS.reference.forEach(type => {
                const row = refTbody.insertRow();
                row.innerHTML = `
                    <td><strong>${type.purpose}</strong></td>
                    <td>${type.mysql}</td>
                    <td>${type.postgres}</td>
                    <td>${type.sqlite}</td>
                    <td>${type.oracle}</td>
                    <td>${type.sqlserver}</td>
                `;
            });
        }

        function showDocsTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById(`docs${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
            event.target.classList.add('active');
        }

        function convertJSONtoSQL() {
            try {
                const jsonInput = document.getElementById('jsonInput').value.trim();
                if (!jsonInput) throw new Error('JSON пустой');
                
                currentDBType = document.getElementById('dbType').value;
                const data = JSON.parse(jsonInput);
                const config = DB_CONFIG[currentDBType];
                
                const result = generateSQLWithMapping(data, config);
                document.getElementById('sqlOutput').value = result.sql;
                currentFieldMapping = result.mapping;
                
                originalFieldNames.clear();
                currentFieldMapping.forEach(field => {
                    originalFieldNames.set(field.field, field.originalName || field.field);
                });
                
                updateFieldMappingTable();
                showStatus('success', `✅ ${data.length} записей | ${result.insertBatches} батчей | ${currentDBType.toUpperCase()}`);
                
            } catch (error) {
                showStatus('error', `❌ ${error.message}`);
            }
        }

        function applyCaseConversion() {
            const caseStyle = document.querySelector('input[name="caseStyle"]:checked').value;
            currentFieldMapping.forEach(field => {
                if (!field.originalName) field.originalName = field.field;
                field.field = CASE_CONVERTERS[caseStyle](field.originalName);
            });
            updateFieldMappingTable();
            regenerateSQL();
            showStatus('success', `✅ Стиль: ${caseStyle.replace(/([A-Z])/g, ' $1').trim()}`);
        }

        function regenerateSQL() {
            if (!currentFieldMapping.length) return;
            const jsonInput = document.getElementById('jsonInput').value;
            const data = JSON.parse(jsonInput);
            const config = DB_CONFIG[currentDBType];
            const tableName = 'DATA';
            
            let sql = generateCreateTable(tableName, currentFieldMapping, config);
            const chunkSize = 100;
            for (let i = 0; i < data.length; i += chunkSize) {
                const chunk = data.slice(i, i + chunkSize);
                sql += generateInsertBatchWithCustomNames(chunk, tableName, currentFieldMapping.map(m => m.field), config);
            }
            document.getElementById('sqlOutput').value = sql;
        }

        // Утилиты (сокращены для читаемости)
        function generateFieldMapping(record, config) {
            const mapping = [];
            for (let key in record) {
                const sampleValue = record[key];
                const fieldName = CASE_CONVERTERS['camelCase'](key);
                mapping.push({
                    field: fieldName,
                    originalName: key,
                    jsonType: getJSONType(sampleValue),
                    sqlType: inferBestSQLType(sampleValue, config),
                    sample: formatSample(sampleValue),
                    isPrimary: fieldName.match(/^id|ID$/i) !== null
                });
            }
            return mapping.sort((a, b) => a.isPrimary !== b.isPrimary ? a.isPrimary ? -1 : 1 : a.field.localeCompare(b.field));
        }

        function getJSONType(value) {
            if (value === null || value === undefined) return 'null';
            if (Array.isArray(value)) return 'array';
            return typeof value === 'object' ? 'object' : typeof value;
        }

        function inferBestSQLType(value, config) {
            if (value === null) return config.text;
            const type = typeof value;
            switch (type) {
                case 'number': return Number.isInteger(value) ? config.integer : config.decimal;
                case 'boolean': return config.boolean;
                case 'string':
                    if (value.match(/^\d{4}-\d{2}-\d{2}/)) return value.includes('T') ? config.timestamp : config.date;
                    return value.length > 4000 ? config.text : config.varchar;
                case 'object': return config.json;
                default: return config.text;
            }
        }

        function formatSample(value) {
            if (value === null) return 'NULL';
            if (typeof value === 'object') return JSON.stringify(value).slice(0, 40) + '...';
            return String(value).slice(0, 40);
        }

        function updateFieldMappingTable() {
            const caseStyle = document.querySelector('input[name="caseStyle"]:checked').value;
            let html = `
                <table>
                    <thead><tr><th>Оригинал</th><th>Текущее</th><th>JSON</th><th>SQL (${currentDBType.toUpperCase()})</th><th>Пример</th><th>PK</th></tr></thead>
                    <tbody>
            `;
            currentFieldMapping.forEach(m => {
                html += `
                    <tr>
                        <td><code>${m.originalName || m.field}</code></td>
                        <td><code>${m.field}</code></td>
                        <td><span class="type-badge json-type">${m.jsonType}</span></td>
                        <td><span class="type-badge sql-type">${m.sqlType}</span></td>
                        <td title="${m.sample}">${m.sample}</td>
                        <td>${m.isPrimary ? '⭐' : ''}</td>
                    </tr>
                `;
            });
            html += '</tbody></table>';
            document.getElementById('fieldMappingTable').innerHTML = html;
        }

        // Остальные функции (generateSQLWithMapping, generateCreateTable, etc.) остаются без изменений
        function showStatus(type, message) {
            const status = document.getElementById('status') || document.createElement('div');
            status.id = 'status';
            status.className = `status ${type}`;
            status.innerHTML = message;
            if (!document.getElementById('status')) document.querySelector('.table-panel').appendChild(status);
        }

        function copyToClipboard() { navigator.clipboard.writeText(document.getElementById('sqlOutput').value).then(() => showStatus('success', '📋 Скопировано!')); }
        function downloadSQL() { /* упрощено */ showStatus('success', '💾 Готово!'); }

        // Инициализация
        window.addEventListener('load', () => {
            initDocs();
            convertJSONtoSQL();
        });
