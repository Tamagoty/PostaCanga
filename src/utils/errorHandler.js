// Arquivo: src/utils/errorHandler.js
// DESCRIÇÃO: Centraliza a lógica de tratamento de erros do Supabase,
// traduzindo mensagens técnicas para um feedback amigável ao usuário.

export const handleSupabaseError = (error) => {
  if (!error) {
    return 'Ocorreu um erro inesperado.';
  }

  const errorMessage = error.message.toLowerCase();
  console.error("Supabase Error:", error); // Mantém o erro original no console para debug

  // Erros de violação de chave estrangeira (ex: tentar apagar algo em uso)
  if (errorMessage.includes('violates foreign key constraint')) {
    if (errorMessage.includes('customers_address_id_fkey')) {
      return 'Não é possível apagar este endereço, pois ele está associado a um ou mais clientes.';
    }
    // Adicionar outras verificações de chaves estrangeiras aqui...
    return 'Não é possível apagar este item, pois ele está sendo usado em outro lugar.';
  }

  // Erros de violação de unicidade (ex: CPF, e-mail ou nome já cadastrado)
  if (errorMessage.includes('unique constraint')) {
     if (errorMessage.includes('customers_cpf_key')) {
      return 'Este CPF já está cadastrado.';
    }
    if (errorMessage.includes('customers_cellphone_key')) {
      return 'Este celular já está cadastrado.';
    }
     if (errorMessage.includes('employees_registration_number_key')) {
      return 'Esta matrícula já está cadastrada.';
    }
    return 'O valor inserido já existe e não pode ser duplicado.';
  }
  
  // Erro comum de RLS (Row Level Security)
  if (error.code === '42501') {
      return 'Acesso negado. Você não tem permissão para realizar esta ação.';
  }

  // Mensagens de erro de autenticação mais amigáveis
  if (errorMessage.includes('invalid login credentials')) {
      return 'E-mail ou senha inválidos. Por favor, verifique seus dados.';
  }
   if (errorMessage.includes('user already registered')) {
      return 'Este e-mail já foi registado. Tente fazer o login.';
  }

  // Retorno padrão para outros erros não mapeados
  return error.message;
};
