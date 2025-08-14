export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      _backfill_report_org_nulls: {
        Row: {
          created_at: string
          id: string
          reason: string
          table_name: string
        }
        Insert: {
          created_at?: string
          id: string
          reason: string
          table_name: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          table_name?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          active: boolean | null
          created_at: string
          created_by: string
          expires_at: string | null
          href: string | null
          id: string
          kind: string
          link_label: string | null
          message: string
          organization_id: string | null
          target_roles: string[] | null
          target_routes: string[] | null
          target_users: string[] | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          href?: string | null
          id?: string
          kind: string
          link_label?: string | null
          message: string
          organization_id?: string | null
          target_roles?: string[] | null
          target_routes?: string[] | null
          target_users?: string[] | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          href?: string | null
          id?: string
          kind?: string
          link_label?: string | null
          message?: string
          organization_id?: string | null
          target_roles?: string[] | null
          target_routes?: string[] | null
          target_users?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      app_permissions: {
        Row: {
          description: string | null
          key: string
          name: string
        }
        Insert: {
          description?: string | null
          key: string
          name: string
        }
        Update: {
          description?: string | null
          key?: string
          name?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          created_at: string
          descricao: string | null
          id: string
          organization_id: string | null
          tipo: string | null
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          organization_id?: string | null
          tipo?: string | null
          updated_at?: string
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          organization_id?: string | null
          tipo?: string | null
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      historico: {
        Row: {
          created_at: string
          descricao: string
          detalhes: Json | null
          id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          descricao: string
          detalhes?: Json | null
          id?: string
          tipo: string
        }
        Update: {
          created_at?: string
          descricao?: string
          detalhes?: Json | null
          id?: string
          tipo?: string
        }
        Relationships: []
      }
      historico_depara: {
        Row: {
          acao: string
          created_at: string
          id: string
          mapeamento_id: string
          motivo: string | null
          organization_id: string | null
          usuario_id: string | null
          valores_anteriores: Json | null
          valores_novos: Json | null
        }
        Insert: {
          acao: string
          created_at?: string
          id?: string
          mapeamento_id: string
          motivo?: string | null
          organization_id?: string | null
          usuario_id?: string | null
          valores_anteriores?: Json | null
          valores_novos?: Json | null
        }
        Update: {
          acao?: string
          created_at?: string
          id?: string
          mapeamento_id?: string
          motivo?: string | null
          organization_id?: string | null
          usuario_id?: string | null
          valores_anteriores?: Json | null
          valores_novos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_depara_org_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_depara_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_vendas: {
        Row: {
          cidade: string | null
          cliente_documento: string | null
          cliente_nome: string | null
          codigo_barras: string | null
          codigo_rastreamento: string | null
          cpf_cnpj: string | null
          created_at: string
          data_pedido: string
          data_prevista: string | null
          descricao: string | null
          empresa: string | null
          id: string
          id_unico: string
          integration_account_id: string | null
          ncm: string | null
          numero_ecommerce: string | null
          numero_pedido: string
          numero_venda: string | null
          obs: string | null
          obs_interna: string | null
          observacoes: string | null
          pedido_id: string | null
          qtd_kit: number | null
          quantidade: number
          situacao: string | null
          sku_estoque: string | null
          sku_kit: string | null
          sku_produto: string
          status: string
          total_itens: number | null
          uf: string | null
          updated_at: string
          url_rastreamento: string | null
          valor_desconto: number | null
          valor_frete: number | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          cidade?: string | null
          cliente_documento?: string | null
          cliente_nome?: string | null
          codigo_barras?: string | null
          codigo_rastreamento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_pedido: string
          data_prevista?: string | null
          descricao?: string | null
          empresa?: string | null
          id?: string
          id_unico: string
          integration_account_id?: string | null
          ncm?: string | null
          numero_ecommerce?: string | null
          numero_pedido: string
          numero_venda?: string | null
          obs?: string | null
          obs_interna?: string | null
          observacoes?: string | null
          pedido_id?: string | null
          qtd_kit?: number | null
          quantidade?: number
          situacao?: string | null
          sku_estoque?: string | null
          sku_kit?: string | null
          sku_produto: string
          status?: string
          total_itens?: number | null
          uf?: string | null
          updated_at?: string
          url_rastreamento?: string | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          cidade?: string | null
          cliente_documento?: string | null
          cliente_nome?: string | null
          codigo_barras?: string | null
          codigo_rastreamento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_pedido?: string
          data_prevista?: string | null
          descricao?: string | null
          empresa?: string | null
          id?: string
          id_unico?: string
          integration_account_id?: string | null
          ncm?: string | null
          numero_ecommerce?: string | null
          numero_pedido?: string
          numero_venda?: string | null
          obs?: string | null
          obs_interna?: string | null
          observacoes?: string | null
          pedido_id?: string | null
          qtd_kit?: number | null
          quantidade?: number
          situacao?: string | null
          sku_estoque?: string | null
          sku_kit?: string | null
          sku_produto?: string
          status?: string
          total_itens?: number | null
          uf?: string | null
          updated_at?: string
          url_rastreamento?: string | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "historico_vendas_integration_account_id_fkey"
            columns: ["integration_account_id"]
            isOneToOne: false
            referencedRelation: "integration_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_accounts: {
        Row: {
          account_identifier: string | null
          cnpj: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          provider: Database["public"]["Enums"]["integration_provider"]
          public_auth: Json | null
          updated_at: string
        }
        Insert: {
          account_identifier?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          provider: Database["public"]["Enums"]["integration_provider"]
          public_auth?: Json | null
          updated_at?: string
        }
        Update: {
          account_identifier?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          provider?: Database["public"]["Enums"]["integration_provider"]
          public_auth?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_accounts_org_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_secrets: {
        Row: {
          access_token: string | null
          client_id: string | null
          client_secret: string | null
          created_at: string
          expires_at: string | null
          id: string
          integration_account_id: string
          organization_id: string
          payload: Json | null
          provider: string
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          integration_account_id: string
          organization_id: string
          payload?: Json | null
          provider: string
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          integration_account_id?: string
          organization_id?: string
          payload?: Json | null
          provider?: string
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_secrets_integration_account_id_fkey"
            columns: ["integration_account_id"]
            isOneToOne: false
            referencedRelation: "integration_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_secrets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role_id: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role_id: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role_id?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      itens_pedidos: {
        Row: {
          codigo_barras: string | null
          created_at: string
          descricao: string
          empresa: string | null
          id: string
          integration_account_id: string | null
          ncm: string | null
          numero_pedido: string
          numero_venda: string | null
          observacoes: string | null
          pedido_id: string
          quantidade: number
          sku: string
          updated_at: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          codigo_barras?: string | null
          created_at?: string
          descricao: string
          empresa?: string | null
          id?: string
          integration_account_id?: string | null
          ncm?: string | null
          numero_pedido: string
          numero_venda?: string | null
          observacoes?: string | null
          pedido_id: string
          quantidade?: number
          sku: string
          updated_at?: string
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          codigo_barras?: string | null
          created_at?: string
          descricao?: string
          empresa?: string | null
          id?: string
          integration_account_id?: string | null
          ncm?: string | null
          numero_pedido?: string
          numero_venda?: string | null
          observacoes?: string | null
          pedido_id?: string
          quantidade?: number
          sku?: string
          updated_at?: string
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedidos_integration_account_id_fkey"
            columns: ["integration_account_id"]
            isOneToOne: false
            referencedRelation: "integration_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedidos_pedido_fk"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedidos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      mapeamentos_depara: {
        Row: {
          ativo: boolean
          created_at: string
          data_mapeamento: string | null
          id: string
          motivo_criacao: string | null
          observacoes: string | null
          organization_id: string | null
          pedidos_aguardando: number | null
          prioridade: string | null
          quantidade: number
          sku_correspondente: string | null
          sku_pedido: string
          sku_simples: string | null
          tempo_criacao_pedido: string | null
          updated_at: string
          usuario_mapeamento: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_mapeamento?: string | null
          id?: string
          motivo_criacao?: string | null
          observacoes?: string | null
          organization_id?: string | null
          pedidos_aguardando?: number | null
          prioridade?: string | null
          quantidade?: number
          sku_correspondente?: string | null
          sku_pedido: string
          sku_simples?: string | null
          tempo_criacao_pedido?: string | null
          updated_at?: string
          usuario_mapeamento?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_mapeamento?: string | null
          id?: string
          motivo_criacao?: string | null
          observacoes?: string | null
          organization_id?: string | null
          pedidos_aguardando?: number | null
          prioridade?: string | null
          quantidade?: number
          sku_correspondente?: string | null
          sku_pedido?: string
          sku_simples?: string | null
          tempo_criacao_pedido?: string | null
          updated_at?: string
          usuario_mapeamento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mapeamentos_depara_org_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mapeamentos_depara_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string
          id: string
          motivo: string | null
          observacoes: string | null
          produto_id: string
          quantidade_anterior: number
          quantidade_movimentada: number
          quantidade_nova: number
          tipo_movimentacao: string
        }
        Insert: {
          created_at?: string
          id?: string
          motivo?: string | null
          observacoes?: string | null
          produto_id: string
          quantidade_anterior: number
          quantidade_movimentada: number
          quantidade_nova: number
          tipo_movimentacao: string
        }
        Update: {
          created_at?: string
          id?: string
          motivo?: string | null
          observacoes?: string | null
          produto_id?: string
          quantidade_anterior?: number
          quantidade_movimentada?: number
          quantidade_nova?: number
          tipo_movimentacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_states: {
        Row: {
          code_verifier: string
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          code_verifier: string
          created_at?: string
          expires_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code_verifier?: string
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      organizacoes: {
        Row: {
          ativo: boolean
          cnpj: string | null
          created_at: string
          id: string
          nome: string
          plano: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          id?: string
          nome: string
          plano?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          id?: string
          nome?: string
          plano?: string
          updated_at?: string
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          cidade: string | null
          codigo_rastreamento: string | null
          cpf_cnpj: string | null
          created_at: string
          data_pedido: string
          data_prevista: string | null
          empresa: string | null
          id: string
          integration_account_id: string | null
          nome_cliente: string
          numero: string
          numero_ecommerce: string | null
          numero_venda: string | null
          obs: string | null
          obs_interna: string | null
          situacao: string
          uf: string | null
          updated_at: string
          url_rastreamento: string | null
          valor_desconto: number
          valor_frete: number
          valor_total: number
        }
        Insert: {
          cidade?: string | null
          codigo_rastreamento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_pedido: string
          data_prevista?: string | null
          empresa?: string | null
          id?: string
          integration_account_id?: string | null
          nome_cliente: string
          numero: string
          numero_ecommerce?: string | null
          numero_venda?: string | null
          obs?: string | null
          obs_interna?: string | null
          situacao: string
          uf?: string | null
          updated_at?: string
          url_rastreamento?: string | null
          valor_desconto?: number
          valor_frete?: number
          valor_total: number
        }
        Update: {
          cidade?: string | null
          codigo_rastreamento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_pedido?: string
          data_prevista?: string | null
          empresa?: string | null
          id?: string
          integration_account_id?: string | null
          nome_cliente?: string
          numero?: string
          numero_ecommerce?: string | null
          numero_venda?: string | null
          obs?: string | null
          obs_interna?: string | null
          situacao?: string
          uf?: string | null
          updated_at?: string
          url_rastreamento?: string | null
          valor_desconto?: number
          valor_frete?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_integration_account_id_fkey"
            columns: ["integration_account_id"]
            isOneToOne: false
            referencedRelation: "integration_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo_barras: string | null
          created_at: string
          descricao: string | null
          estoque_maximo: number
          estoque_minimo: number
          id: string
          integration_account_id: string | null
          localizacao: string | null
          nome: string
          organization_id: string | null
          preco_custo: number | null
          preco_venda: number | null
          quantidade_atual: number
          sku_interno: string
          status: string
          ultima_movimentacao: string | null
          updated_at: string
          url_imagem: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo_barras?: string | null
          created_at?: string
          descricao?: string | null
          estoque_maximo?: number
          estoque_minimo?: number
          id?: string
          integration_account_id?: string | null
          localizacao?: string | null
          nome: string
          organization_id?: string | null
          preco_custo?: number | null
          preco_venda?: number | null
          quantidade_atual?: number
          sku_interno: string
          status?: string
          ultima_movimentacao?: string | null
          updated_at?: string
          url_imagem?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo_barras?: string | null
          created_at?: string
          descricao?: string | null
          estoque_maximo?: number
          estoque_minimo?: number
          id?: string
          integration_account_id?: string | null
          localizacao?: string | null
          nome?: string
          organization_id?: string | null
          preco_custo?: number | null
          preco_venda?: number | null
          quantidade_atual?: number
          sku_interno?: string
          status?: string
          ultima_movimentacao?: string | null
          updated_at?: string
          url_imagem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_integration_account_id_fkey"
            columns: ["integration_account_id"]
            isOneToOne: false
            referencedRelation: "integration_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cargo: string | null
          configuracoes_notificacao: Json | null
          created_at: string
          departamento: string | null
          id: string
          nome_completo: string | null
          nome_exibicao: string | null
          onboarding_banner_dismissed: boolean
          organizacao_id: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cargo?: string | null
          configuracoes_notificacao?: Json | null
          created_at?: string
          departamento?: string | null
          id: string
          nome_completo?: string | null
          nome_exibicao?: string | null
          onboarding_banner_dismissed?: boolean
          organizacao_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cargo?: string | null
          configuracoes_notificacao?: Json | null
          created_at?: string
          departamento?: string | null
          id?: string
          nome_completo?: string | null
          nome_exibicao?: string | null
          onboarding_banner_dismissed?: boolean
          organizacao_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_key: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_key: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "app_permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          name: string
          organization_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          organization_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_control: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          process_name: string
          progress: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          process_name: string
          progress?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          process_name?: string
          progress?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_control_org_fk"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_control_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          active: boolean | null
          created_at: string
          expires_at: string | null
          href: string | null
          id: string
          kind: string
          link_label: string | null
          message: string
          priority: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          expires_at?: string | null
          href?: string | null
          id?: string
          kind: string
          link_label?: string | null
          message: string
          priority?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          expires_at?: string | null
          href?: string | null
          id?: string
          kind?: string
          link_label?: string | null
          message?: string
          priority?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tiny_v3_credentials: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string
          id: string
          organization_id: string
          redirect_uri: string
          updated_at: string
        }
        Insert: {
          client_id: string
          client_secret: string
          created_at?: string
          id?: string
          organization_id: string
          redirect_uri: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string
          id?: string
          organization_id?: string
          redirect_uri?: string
          updated_at?: string
        }
        Relationships: []
      }
      tiny_v3_tokens: {
        Row: {
          access_token: string
          expires_at: string
          id: string
          organization_id: string
          refresh_token: string
          scope: string | null
          token_type: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          expires_at: string
          id?: string
          organization_id: string
          refresh_token: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          expires_at?: string
          id?: string
          organization_id?: string
          refresh_token?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_dismissed_notifications: {
        Row: {
          dismissed_at: string
          id: string
          notification_id: string
          notification_type: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          id?: string
          notification_id: string
          notification_type: string
          user_id: string
        }
        Update: {
          dismissed_at?: string
          id?: string
          notification_id?: string
          notification_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permission_overrides: {
        Row: {
          allow: boolean
          created_at: string
          id: string
          organization_id: string
          permission_key: string
          user_id: string
        }
        Insert: {
          allow: boolean
          created_at?: string
          id?: string
          organization_id: string
          permission_key: string
          user_id: string
        }
        Update: {
          allow?: boolean
          created_at?: string
          id?: string
          organization_id?: string
          permission_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "app_permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      user_role_assignments: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: {
        Args: { _token: string }
        Returns: Json
      }
      admin_list_profiles: {
        Args:
          | { _limit?: number; _offset?: number; _search?: string }
          | { _search?: string }
        Returns: {
          avatar_url: string | null
          bio: string | null
          cargo: string | null
          configuracoes_notificacao: Json | null
          created_at: string
          departamento: string | null
          id: string
          nome_completo: string | null
          nome_exibicao: string | null
          onboarding_banner_dismissed: boolean
          organizacao_id: string | null
          telefone: string | null
          updated_at: string
        }[]
      }
      backfill_config_for_current_org: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      cleanup_expired_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      complete_onboarding: {
        Args: {
          org_cnpj: string
          org_nome: string
          tiny_token: string
          user_cargo: string
          user_nome: string
        }
        Returns: Json
      }
      create_invitation: {
        Args: { _email: string; _expires_in_days?: number; _role_id: string }
        Returns: {
          id: string
          token: string
        }[]
      }
      get_current_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_historico_vendas_masked: {
        Args: {
          _end?: string
          _limit?: number
          _offset?: number
          _search?: string
          _start?: string
        }
        Returns: {
          cidade: string
          cliente_documento: string
          cliente_nome: string
          codigo_barras: string
          codigo_rastreamento: string
          cpf_cnpj: string
          created_at: string
          data_pedido: string
          data_prevista: string
          descricao: string
          id: string
          id_unico: string
          ncm: string
          numero_ecommerce: string
          numero_pedido: string
          numero_venda: string
          obs: string
          obs_interna: string
          observacoes: string
          pedido_id: string
          qtd_kit: number
          quantidade: number
          situacao: string
          sku_estoque: string
          sku_kit: string
          sku_produto: string
          status: string
          total_itens: number
          uf: string
          updated_at: string
          url_rastreamento: string
          valor_desconto: number
          valor_frete: number
          valor_total: number
          valor_unitario: number
        }[]
      }
      get_pedidos_masked: {
        Args: {
          _end?: string
          _limit?: number
          _offset?: number
          _search?: string
          _start?: string
        }
        Returns: {
          cidade: string | null
          codigo_rastreamento: string | null
          cpf_cnpj: string | null
          created_at: string
          data_pedido: string
          data_prevista: string | null
          empresa: string | null
          id: string
          integration_account_id: string | null
          nome_cliente: string
          numero: string
          numero_ecommerce: string | null
          numero_venda: string | null
          obs: string | null
          obs_interna: string | null
          situacao: string
          uf: string | null
          updated_at: string
          url_rastreamento: string | null
          valor_desconto: number
          valor_frete: number
          valor_total: number
        }[]
      }
      get_user_permissions: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      has_permission: {
        Args: { permission_key: string }
        Returns: boolean
      }
      hv_delete: {
        Args: { _id: string }
        Returns: undefined
      }
      hv_delete_many: {
        Args: { _ids: string[] }
        Returns: undefined
      }
      mask_document: {
        Args: { doc: string }
        Returns: string
      }
      mask_name: {
        Args: { full_name: string }
        Returns: string
      }
      revoke_invitation: {
        Args: { _id: string }
        Returns: Json
      }
      seed_admin_role_for_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: undefined
      }
      user_matches_announcement: {
        Args: { _target_roles: string[]; _target_users: string[] }
        Returns: boolean
      }
    }
    Enums: {
      integration_provider: "tiny" | "shopee" | "mercadolivre"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      integration_provider: ["tiny", "shopee", "mercadolivre"],
    },
  },
} as const
