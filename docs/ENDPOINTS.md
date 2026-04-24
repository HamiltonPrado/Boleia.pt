# Backend PHP — Mapa de Endpoints

Base URL: `http://localhost/Boleia/backend`

## Auth
| Método | Ficheiro | Descrição |
|--------|----------|-----------|
| POST | `auth/register.php` | Criar conta |
| POST | `auth/login.php` | Iniciar sessão |
| POST | `auth/logout.php` | Terminar sessão |
| GET  | `auth/me.php` | Utilizador da sessão atual |

## Rotas
| Método | Ficheiro | Descrição |
|--------|----------|-----------|
| GET    | `routes/index.php` | Listar rotas do motorista |
| POST   | `routes/index.php` | Criar rota |
| GET    | `routes/detail.php?id=` | Detalhe de rota |
| PATCH  | `routes/detail.php?id=` | Atualizar estado da rota (ACTIVE / PAUSED / ARCHIVED) |
| DELETE | `routes/detail.php?id=` | Apagar rota (cascata) |
| POST   | `routes/generate.php?id=` | Gerar ocorrências para os próximos 30 dias |
| GET    | `routes/stats.php` | Estatísticas do motorista autenticado |
| GET    | `routes/public_stats.php` | Estatísticas públicas (sem auth) |

## Reservas
| Método | Ficheiro | Descrição |
|--------|----------|-----------|
| GET    | `bookings/search.php?date=&originLat=&originLng=&destLat=&destLng=` | Pesquisar viagens disponíveis |
| GET    | `bookings/index.php` | Reservas do passageiro autenticado |
| POST   | `bookings/index.php` | Criar reserva |
| DELETE | `bookings/cancel.php?id=` | Cancelar reserva (passageiro) |
| GET    | `bookings/driver_bookings.php?status=` | Reservas do motorista por estado (PENDING \| CONFIRMED \| COMPLETED) |
| PATCH  | `bookings/update_status.php?id=` | Confirmar ou recusar reserva (motorista) |
| POST   | `bookings/complete.php?id=` | Concluir reserva ou marcar no-show (motorista) |
| DELETE | `bookings/driver_cancel.php?id=` | Cancelar reserva confirmada (motorista) |

## Avaliações
| Método | Ficheiro | Descrição |
|--------|----------|-----------|
| POST | `reviews/create.php` | Passageiro avalia motorista |
| POST | `reviews/create_driver.php` | Motorista avalia passageiro |
| GET  | `reviews/reviewable.php` | Reservas concluídas do passageiro (com flag de avaliação) |
| GET  | `reviews/received.php` | Avaliações recebidas pelo utilizador autenticado |

## Utilizadores
| Método | Ficheiro | Descrição |
|--------|----------|-----------|
| GET   | `users/profile.php?id=` | Perfil público do motorista |
| PATCH | `users/profile.php` | Atualizar perfil próprio |
| PATCH | `users/password.php` | Alterar password |
| GET   | `users/car.php` | Info do carro (motorista) |
| PATCH | `users/car.php` | Atualizar dados do carro |
| GET   | `users/documents.php` | Listar documentos do motorista |
| POST  | `users/documents.php` | Submeter documento (LICENSE / INSURANCE / ID) |

## Admin (requer role=ADMIN)
| Método | Ficheiro | Descrição |
|--------|----------|-----------|
| GET   | `admin/stats.php` | Estatísticas globais |
| GET   | `admin/activity.php` | Atividade recente (gráfico 4 semanas) |
| GET   | `admin/users.php?page=&limit=&search=` | Listar utilizadores (paginado) |
| GET   | `admin/drivers_pending.php` | Motoristas pendentes de verificação |
| PATCH | `admin/review_driver.php?id=` | Aprovar ou rejeitar motorista |
| PATCH | `admin/update_user_status.php?id=` | Ativar ou suspender utilizador |
| GET   | `admin/documents.php` | Documentos pendentes de revisão |
| PATCH | `admin/review_document.php?id=` | Aprovar ou rejeitar documento |

## Funcionalidades não implementadas
- **Pagamentos Stripe** — cancelamentos funcionam sem reembolso automático
- **Notificações em tempo real** (SSE/WebSocket)
- **Geocoding automático** de moradas
