export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      configuracoes: {
        Row: {
          chave: string
          created_at: string
          descricao: string | null
          id: string
          tipo: string | null
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          tipo?: string | null
          updated_at?: string
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
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
          usuario_id?: string | null
          valores_anteriores?: Json | null
          valores_novos?: Json | null
        }
        Relationships: []
      }
      historico_vendas: {
        Row: {
          cliente_documento: string | null
          cliente_nome: string | null
          created_at: string
          data_venda: string
          id: string
          id_unico: string
          nome_produto: string | null
          numero_pedido: string
          observacoes: string | null
          quantidade_vendida: number
          sku_produto: string
          status: string
          updated_at: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          cliente_documento?: string | null
          cliente_nome?: string | null
          created_at?: string
          data_venda: string
          id?: string
          id_unico: string
          nome_produto?: string | null
          numero_pedido: string
          observacoes?: string | null
          quantidade_vendida?: number
          sku_produto: string
          status?: string
          updated_at?: string
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          cliente_documento?: string | null
          cliente_nome?: string | null
          created_at?: string
          data_venda?: string
          id?: string
          id_unico?: string
          nome_produto?: string | null
          numero_pedido?: string
          observacoes?: string | null
          quantidade_vendida?: number
          sku_produto?: string
          status?: string
          updated_at?: string
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: []
      }
      itens_pedidos: {
        Row: {
          codigo_barras: string | null
          created_at: string
          descricao: string
          id: string
          ncm: string | null
          numero_pedido: string
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
          id?: string
          ncm?: string | null
          numero_pedido: string
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
          id?: string
          ncm?: string | null
          numero_pedido?: string
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
        Relationships: []
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
      pedidos: {
        Row: {
          canal_venda: string | null
          codigo_rastreamento: string | null
          cpf_cnpj: string | null
          created_at: string
          data_pedido: string
          data_prevista: string | null
          id: string
          nome_cliente: string
          nome_ecommerce: string | null
          numero: string
          numero_ecommerce: string | null
          obs: string | null
          obs_interna: string | null
          situacao: string
          updated_at: string
          url_rastreamento: string | null
          valor_desconto: number
          valor_frete: number
          valor_total: number
        }
        Insert: {
          canal_venda?: string | null
          codigo_rastreamento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_pedido: string
          data_prevista?: string | null
          id?: string
          nome_cliente: string
          nome_ecommerce?: string | null
          numero: string
          numero_ecommerce?: string | null
          obs?: string | null
          obs_interna?: string | null
          situacao: string
          updated_at?: string
          url_rastreamento?: string | null
          valor_desconto?: number
          valor_frete?: number
          valor_total: number
        }
        Update: {
          canal_venda?: string | null
          codigo_rastreamento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_pedido?: string
          data_prevista?: string | null
          id?: string
          nome_cliente?: string
          nome_ecommerce?: string | null
          numero?: string
          numero_ecommerce?: string | null
          obs?: string | null
          obs_interna?: string | null
          situacao?: string
          updated_at?: string
          url_rastreamento?: string | null
          valor_desconto?: number
          valor_frete?: number
          valor_total?: number
        }
        Relationships: []
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
          localizacao: string | null
          nome: string
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
          localizacao?: string | null
          nome: string
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
          localizacao?: string | null
          nome?: string
          preco_custo?: number | null
          preco_venda?: number | null
          quantidade_atual?: number
          sku_interno?: string
          status?: string
          ultima_movimentacao?: string | null
          updated_at?: string
          url_imagem?: string | null
        }
        Relationships: []
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
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { uri: string }
          | { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { uri: string } | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { uri: string; content: string; content_type: string }
          | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
    Enums: {},
  },
} as const
