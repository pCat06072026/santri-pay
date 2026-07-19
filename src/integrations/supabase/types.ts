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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      jenis_tagihan: {
        Row: {
          created_at: string
          deskripsi: string | null
          id: string
          is_aktif: boolean
          nama: string
          nominal_default: number
          periode: Database["public"]["Enums"]["periode_tagihan"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deskripsi?: string | null
          id?: string
          is_aktif?: boolean
          nama: string
          nominal_default?: number
          periode?: Database["public"]["Enums"]["periode_tagihan"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deskripsi?: string | null
          id?: string
          is_aktif?: boolean
          nama?: string
          nominal_default?: number
          periode?: Database["public"]["Enums"]["periode_tagihan"]
          updated_at?: string
        }
        Relationships: []
      }
      kelas: {
        Row: {
          created_at: string
          id: string
          nama: string
          tahun_ajaran_id: string
          tingkat: string
          updated_at: string
          wali_kelas: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nama: string
          tahun_ajaran_id: string
          tingkat: string
          updated_at?: string
          wali_kelas?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nama?: string
          tahun_ajaran_id?: string
          tingkat?: string
          updated_at?: string
          wali_kelas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kelas_tahun_ajaran_id_fkey"
            columns: ["tahun_ajaran_id"]
            isOneToOne: false
            referencedRelation: "tahun_ajaran"
            referencedColumns: ["id"]
          },
        ]
      }
      kwitansi_counter: {
        Row: {
          last_number: number
          tahun_ajaran_id: string
        }
        Insert: {
          last_number?: number
          tahun_ajaran_id: string
        }
        Update: {
          last_number?: number
          tahun_ajaran_id?: string
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          id: string
          tagihan_id: string | null
          santri_id: string | null
          nomor_tujuan: string
          pesan: string
          status: "terkirim" | "gagal"
          keterangan: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          tagihan_id?: string | null
          santri_id?: string | null
          nomor_tujuan: string
          pesan: string
          status: "terkirim" | "gagal"
          keterangan?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          tagihan_id?: string | null
          santri_id?: string | null
          nomor_tujuan?: string
          pesan?: string
          status?: "terkirim" | "gagal"
          keterangan?: string | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_tagihan_id_fkey"
            columns: ["tagihan_id"]
            isOneToOne: false
            referencedRelation: "tagihan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_logs_santri_id_fkey"
            columns: ["santri_id"]
            isOneToOne: false
            referencedRelation: "santri"
            referencedColumns: ["id"]
          }
        ]
      }
      riwayat_kelas: {
        Row: {
          id: string
          santri_id: string
          kelas_id: string | null
          tahun_ajaran_id: string | null
          kelas_nama: string | null
          tahun_ajaran_nama: string | null
          jenis: string
          catatan: string | null
          dicatat_oleh: string | null
          created_at: string
        }
        Insert: {
          id?: string
          santri_id: string
          kelas_id?: string | null
          tahun_ajaran_id?: string | null
          kelas_nama?: string | null
          tahun_ajaran_nama?: string | null
          jenis: string
          catatan?: string | null
          dicatat_oleh?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          santri_id?: string
          kelas_id?: string | null
          tahun_ajaran_id?: string | null
          kelas_nama?: string | null
          tahun_ajaran_nama?: string | null
          jenis?: string
          catatan?: string | null
          dicatat_oleh?: string | null
          created_at?: string
        }
        Relationships: []
      }
      pembayaran: {
        Row: {
          bukti_url: string | null
          catatan: string | null
          created_at: string
          dicatat_oleh: string | null
          id: string
          jumlah: number
          metode: Database["public"]["Enums"]["metode_pembayaran"]
          nomor_kwitansi: string | null
          referensi: string | null
          tagihan_id: string
          tanggal: string
          updated_at: string
        }
        Insert: {
          bukti_url?: string | null
          catatan?: string | null
          created_at?: string
          dicatat_oleh?: string | null
          id?: string
          jumlah: number
          metode?: Database["public"]["Enums"]["metode_pembayaran"]
          nomor_kwitansi?: string | null
          referensi?: string | null
          tagihan_id: string
          tanggal?: string
          updated_at?: string
        }
        Update: {
          bukti_url?: string | null
          catatan?: string | null
          created_at?: string
          dicatat_oleh?: string | null
          id?: string
          jumlah?: number
          metode?: Database["public"]["Enums"]["metode_pembayaran"]
          nomor_kwitansi?: string | null
          referensi?: string | null
          tagihan_id?: string
          tanggal?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pembayaran_tagihan_id_fkey"
            columns: ["tagihan_id"]
            isOneToOne: false
            referencedRelation: "tagihan"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      santri: {
        Row: {
          alamat: string | null
          created_at: string
          foto_url: string | null
          id: string
          jenis_kelamin: Database["public"]["Enums"]["jenis_kelamin"]
          kelas_id: string | null
          nama_lengkap: string
          nama_wali: string
          no_wa_wali: string
          nis: string
          status: Database["public"]["Enums"]["status_santri"]
          tahun_masuk: number
          tanggal_lahir: string | null
          tempat_lahir: string | null
          updated_at: string
        }
        Insert: {
          alamat?: string | null
          created_at?: string
          foto_url?: string | null
          id?: string
          jenis_kelamin: Database["public"]["Enums"]["jenis_kelamin"]
          kelas_id?: string | null
          nama_lengkap: string
          nama_wali: string
          no_wa_wali: string
          nis: string
          status?: Database["public"]["Enums"]["status_santri"]
          tahun_masuk: number
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          updated_at?: string
        }
        Update: {
          alamat?: string | null
          created_at?: string
          foto_url?: string | null
          id?: string
          jenis_kelamin?: Database["public"]["Enums"]["jenis_kelamin"]
          kelas_id?: string | null
          nama_lengkap?: string
          nama_wali?: string
          no_wa_wali?: string
          nis?: string
          status?: Database["public"]["Enums"]["status_santri"]
          tahun_masuk?: number
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "santri_kelas_id_fkey"
            columns: ["kelas_id"]
            isOneToOne: false
            referencedRelation: "kelas"
            referencedColumns: ["id"]
          },
        ]
      }
      tagihan: {
        Row: {
          catatan: string | null
          created_at: string
          id: string
          jatuh_tempo: string | null
          jenis_tagihan_id: string
          nominal: number
          periode_label: string
          santri_id: string
          sisa: number
          status: Database["public"]["Enums"]["status_tagihan"]
          tahun_ajaran_id: string
          terbayar: number
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          id?: string
          jatuh_tempo?: string | null
          jenis_tagihan_id: string
          nominal?: number
          periode_label: string
          santri_id: string
          sisa?: number
          status?: Database["public"]["Enums"]["status_tagihan"]
          tahun_ajaran_id: string
          terbayar?: number
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          id?: string
          jatuh_tempo?: string | null
          jenis_tagihan_id?: string
          nominal?: number
          periode_label?: string
          santri_id?: string
          sisa?: number
          status?: Database["public"]["Enums"]["status_tagihan"]
          tahun_ajaran_id?: string
          terbayar?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tagihan_jenis_tagihan_id_fkey"
            columns: ["jenis_tagihan_id"]
            isOneToOne: false
            referencedRelation: "jenis_tagihan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tagihan_santri_id_fkey"
            columns: ["santri_id"]
            isOneToOne: false
            referencedRelation: "santri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tagihan_tahun_ajaran_id_fkey"
            columns: ["tahun_ajaran_id"]
            isOneToOne: false
            referencedRelation: "tahun_ajaran"
            referencedColumns: ["id"]
          },
        ]
      }
      tahun_ajaran: {
        Row: {
          created_at: string
          id: string
          is_aktif: boolean
          nama: string
          tanggal_mulai: string
          tanggal_selesai: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_aktif?: boolean
          nama: string
          tanggal_mulai: string
          tanggal_selesai: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_aktif?: boolean
          nama?: string
          tanggal_mulai?: string
          tanggal_selesai?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_bendahara: { Args: never; Returns: boolean }
      recalc_tagihan: { Args: { _tagihan_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "bendahara"
      jenis_kelamin: "L" | "P"
      metode_pembayaran: "tunai" | "transfer" | "qris" | "lainnya"
      periode_tagihan: "bulanan" | "tahunan" | "sekali"
      status_santri: "aktif" | "lulus" | "keluar" | "pindah" | "calon"
      status_tagihan: "belum_bayar" | "sebagian" | "lunas" | "batal"
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
      app_role: ["admin", "bendahara"],
      jenis_kelamin: ["L", "P"],
      metode_pembayaran: ["tunai", "transfer", "qris", "lainnya"],
      periode_tagihan: ["bulanan", "tahunan", "sekali"],
      status_santri: ["aktif", "lulus", "keluar", "pindah", "calon"],
      status_tagihan: ["belum_bayar", "sebagian", "lunas", "batal"],
    },
  },
} as const
