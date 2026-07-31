import { supabase } from "@/integrations/supabase/client";

export interface Country {
  id: string; // Changed from number to string for UUID
  code: string;
  name: string;
  phone_code: string;
  currency_code: string;
  is_active: boolean;
}

export interface Bank {
  id: string; // Changed from number to string for UUID
  name: string;
  code: string;
  swift_code: string;
  supports_international: boolean;
  country_id: string; // Changed from number to string for UUID
}

export interface BankAccount {
  id: string; // Changed from number to string for UUID
  user_id: string;
  bank_id: string; // Changed from number to string for UUID
  account_holder_name: string;
  account_number: string;
  routing_number?: string;
  swift_code?: string;
  iban?: string;
  account_type: string;
  currency: string;
  country_id: string; // Changed from number to string for UUID
  is_primary: boolean;
  is_verified: boolean;
  is_active: boolean;
  verification_status: string;
  verification_date?: string;
  created_at: string;
  updated_at: string;
}

export interface BankAccountDetailed extends BankAccount {
  bank_name: string;
  bank_code: string;
  bank_swift_code: string;
  supports_international: boolean;
  country_name: string;
  country_code: string;
  country_phone_code: string;
  country_currency: string;
}

export interface CreateBankAccountData {
  bank_id: string; // Changed from number to string for UUID
  account_holder_name: string;
  account_number: string;
  routing_number?: string;
  swift_code?: string;
  iban?: string;
  account_type: string;
  currency: string;
  country_id: string; // Changed from number to string for UUID
}

// Get all active countries
export const getCountries = async (): Promise<Country[]> => {
  // Try banking_countries first, then fall back to countries
  let { data, error } = await supabase
    .from("banking_countries")
    .select("*")
    .eq("is_active", true)
    .order("name");

  // If banking_countries doesn't exist, try the original countries table
  if (error && error.code === "PGRST106") {
    const { data: countriesData, error: countriesError } = await supabase
      .from("countries")
      .select("*")
      .order("name")
      .limit(50); // Limit to avoid issues with large tables

    if (countriesError) throw countriesError;
    data = countriesData;
  } else if (error) {
    throw error;
  }

  return data || [];
};

// Get banks by country code
export const getBanksByCountry = async (countryCode: string): Promise<Bank[]> => {
  // Use the get_banks_by_country function which now works with country names
  const { data, error } = await supabase.rpc("get_banks_by_country", {
    country_code: countryCode,
  });

  if (error) throw error;
  return data || [];
};

// Get user's bank accounts
export const getUserBankAccounts = async (userId: string): Promise<BankAccountDetailed[]> => {
  const { data, error } = await supabase
    .from("user_bank_accounts_detailed")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

// Validate bank account before creation
export const validateBankAccount = async (
  userId: string,
  bankId: string, // Changed from number to string for UUID
  accountNumber: string,
  accountHolderName: string
): Promise<boolean> => {
  const { data, error } = await supabase.rpc("validate_bank_account", {
    p_user_id: userId,
    p_bank_id: bankId,
    p_account_number: accountNumber.trim(),
    p_account_holder_name: accountHolderName.trim(),
  });

  if (error) throw error;
  return data || false;
};

// Create a new bank account
export const createBankAccount = async (
  userId: string,
  accountData: CreateBankAccountData
): Promise<BankAccount> => {
  // First validate the account
  const isValid = await validateBankAccount(
    userId,
    accountData.bank_id,
    accountData.account_number,
    accountData.account_holder_name
  );

  if (!isValid) {
    throw new Error("This bank account already exists or is invalid");
  }

  // Check if this is the user's first account
  const existingAccounts = await getUserBankAccounts(userId);
  const isPrimary = existingAccounts.length === 0;

  const { data, error } = await supabase
    .from("user_bank_accounts")
    .insert({
      user_id: userId,
      ...accountData,
      is_primary: isPrimary,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Set primary bank account
export const setPrimaryBankAccount = async (
  userId: string,
  accountId: string // Changed from number to string for UUID
): Promise<boolean> => {
  const { data, error } = await supabase.rpc("set_primary_bank_account", {
    p_user_id: userId,
    p_account_id: accountId,
  });

  if (error) throw error;
  return data || false;
};

// Delete (deactivate) bank account
export const deleteBankAccount = async (
  userId: string,
  accountId: string // Changed from number to string for UUID
): Promise<void> => {
  const { error } = await supabase
    .from("user_bank_accounts")
    .update({ is_active: false })
    .eq("id", accountId)
    .eq("user_id", userId);

  if (error) throw error;
};

// Update bank account verification status
export const updateVerificationStatus = async (
  accountId: string, // Changed from number to string for UUID
  status: "pending" | "verified" | "rejected",
  isVerified: boolean = false
): Promise<void> => {
  const updateData: any = {
    verification_status: status,
    is_verified: isVerified,
  };

  if (isVerified) {
    updateData.verification_date = new Date().toISOString();
  }

  const { error } = await supabase
    .from("user_bank_accounts")
    .update(updateData)
    .eq("id", accountId);

  if (error) throw error;
};

// Get bank account by ID
export const getBankAccountById = async (
  userId: string,
  accountId: string // Changed from number to string for UUID
): Promise<BankAccountDetailed | null> => {
  const { data, error } = await supabase
    .from("user_bank_accounts_detailed")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data;
};

// Search banks by name
export const searchBanks = async (
  countryCode: string,
  searchTerm: string
): Promise<Bank[]> => {
  const { data, error } = await supabase
    .from("banks")
    .select(`
      *,
      countries!inner(code)
    `)
    .eq("countries.code", countryCode)
    .eq("is_active", true)
    .ilike("name", `%${searchTerm}%`)
    .order("name")
    .limit(20);

  if (error) throw error;
  return data || [];
};

// Get popular banks by country
export const getPopularBanks = async (countryCode: string): Promise<Bank[]> => {
  const { data, error } = await supabase
    .from("banks")
    .select(`
      *,
      countries!inner(code)
    `)
    .eq("countries.code", countryCode)
    .eq("is_active", true)
    .eq("supports_international", true)
    .order("name")
    .limit(10);

  if (error) throw error;
  return data || [];
};

// Validate IBAN format (basic validation)
export const validateIBAN = (iban: string): boolean => {
  if (!iban) return true; // IBAN is optional
  
  // Remove spaces and convert to uppercase
  const cleanIBAN = iban.replace(/\s/g, "").toUpperCase();
  
  // Basic IBAN format check (2 letters + 2 digits + up to 30 alphanumeric)
  const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
  
  return ibanRegex.test(cleanIBAN);
};

// Validate SWIFT code format
export const validateSWIFT = (swift: string): boolean => {
  if (!swift) return true; // SWIFT is optional
  
  // SWIFT code format: 8 or 11 characters (4 bank + 2 country + 2 location + optional 3 branch)
  const swiftRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  
  return swiftRegex.test(swift.toUpperCase());
};

// Format account number for display (mask middle digits)
export const formatAccountNumber = (accountNumber: string): string => {
  if (accountNumber.length <= 4) return accountNumber;
  
  const visibleDigits = 4;
  const maskedLength = accountNumber.length - visibleDigits;
  const masked = "*".repeat(maskedLength);
  const visible = accountNumber.slice(-visibleDigits);
  
  return masked + visible;
};

// Get supported currencies by country
export const getSupportedCurrencies = async (countryCode: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("countries")
    .select("currency_code")
    .eq("code", countryCode)
    .single();

  if (error) throw error;
  return data ? [data.currency_code] : [];
};

// Bank account statistics for admin/analytics
export const getBankAccountStats = async (): Promise<{
  total_accounts: number;
  verified_accounts: number;
  pending_verification: number;
  countries_supported: number;
  banks_supported: number;
}> => {
  const [accountsRes, verifiedRes, pendingRes, countriesRes, banksRes] = await Promise.all([
    supabase.from("user_bank_accounts").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("user_bank_accounts").select("id", { count: "exact", head: true }).eq("is_verified", true).eq("is_active", true),
    supabase.from("user_bank_accounts").select("id", { count: "exact", head: true }).eq("verification_status", "pending").eq("is_active", true),
    supabase.from("countries").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("banks").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  return {
    total_accounts: accountsRes.count || 0,
    verified_accounts: verifiedRes.count || 0,
    pending_verification: pendingRes.count || 0,
    countries_supported: countriesRes.count || 0,
    banks_supported: banksRes.count || 0,
  };
};