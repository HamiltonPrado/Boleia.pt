# boleia.pt

Projeto desenvolvido no âmbito da unidade curricular **Desenvolvimento de Aplicações Web** da Licenciatura em Engenharia Informática.

## Descrição

O **boleia.pt** é uma plataforma web que pretende facilitar a partilha de deslocações pendulares entre casa e trabalho.

Na aplicação, os motoristas podem publicar as suas rotas habituais e os passageiros podem procurar rotas compatíveis e reservar um lugar disponível, contribuindo para os custos da viagem.

O objetivo é reduzir os custos de transporte, melhorar a eficiência das deslocações e promover a partilha de viagens entre pessoas com trajetos semelhantes.

## Equipa

- Francisco Batista
- Francisco Pascoal
- Lueji Covilhã
- Yassin Latif
- Yosvany Nunes

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| Backend | PHP 8.x (API REST, sem framework) |
| Base de dados | MySQL |
| Autenticação | Sessões PHP |
| Mapas | Leaflet / OpenStreetMap |
| Ícones | Bootstrap Icons |

## Funcionalidades

- Registo e autenticação de utilizadores (passageiro / condutor)
- Publicação de rotas recorrentes com dias da semana configuráveis
- Geração de ocorrências de viagens para os próximos 30 dias
- Pesquisa de viagens por data e geolocalização (raio de 25 km)
- Sistema de reservas com controlo de lugares disponíveis
- Fluxo de confirmação/recusa de reservas pelo condutor
- Cancelamento com cálculo de reembolso (100% se >3h, 50% se <3h)
- Avaliações bidirecionais (passageiro ↔ condutor)
- Upload e verificação de documentos do condutor (carta, seguro, BI)
- Painel de administração (utilizadores, motoristas, documentos, estatísticas)

## Estrutura do Projeto

```
Boleia/
├── frontend/               # Interface do utilizador
│   ├── index.html          # Landing page (pública)
│   ├── login.html          # Autenticação
│   ├── registo.html        # Criação de conta
│   ├── dashboard.html      # Painel do utilizador autenticado
│   ├── pesquisa.html       # Pesquisa de viagens
│   ├── publicar.html       # Publicar rota (condutor)
│   ├── reservas.html       # Reservas do passageiro
│   ├── viagem.html         # Detalhe de viagem
│   ├── perfil.html         # Perfil e documentos
│   ├── admin.html          # Painel de administração
│   ├── style.css           # Estilos globais
│   └── utils.js            # Utilitários partilhados
│
├── backend/                # API REST em PHP
│   ├── db.php              # Ligação à BD + helpers
│   ├── auth_helper.php     # Sessão, autenticação, CORS
│   ├── auth/               # Login, logout, registo, sessão atual
│   ├── bookings/           # Reservas
│   ├── routes/             # Rotas e ocorrências
│   ├── reviews/            # Avaliações
│   ├── users/              # Perfil, password, carro, documentos
│   └── admin/              # Administração
│
└── docs/
    ├── ENDPOINTS.md                    # Mapa completo de endpoints
    └── boleia.postman_collection.json  # Coleção Postman
```

## Instalação

### Pré-requisitos
- [MAMP](https://www.mamp.info/) (ou XAMPP)
- PHP 8.0+
- MySQL 5.7+

### Passos

**1. Clonar o repositório**
```bash
git clone https://github.com/HamiltonPrado/Boleia.pt.git
```
Colocar a pasta dentro de `htdocs/` do MAMP.

**2. Criar a base de dados**

No phpMyAdmin, criar uma base de dados `boleia` e importar o schema SQL.

**3. Configurar credenciais**

Editar `backend/db.php`:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'boleia');
define('DB_USER', 'root');
define('DB_PASS', 'root');
```

**4. Iniciar o MAMP e aceder**
```
http://localhost/Boleia/frontend/index.html
```

## Fluxo Principal

```
Condutor                          Passageiro
   │                                  │
   ├─ Registo (role: DRIVER)          ├─ Registo (role: PASSENGER)
   ├─ Upload de documentos            │
   ├─ Aprovação pelo admin            │
   ├─ Publicar rota                   │
   ├─ Gerar ocorrências               ├─ Pesquisar por data
   ├─ Receber pedido de reserva  ←────┤
   ├─ Confirmar reserva               │
   ├─ Realizar viagem                 │
   ├─ Marcar como concluída           ├─ Avaliar condutor
   └─ Avaliar passageiro         ←────┘
```

## Estado do Projeto

Projeto em desenvolvimento no contexto académico.
