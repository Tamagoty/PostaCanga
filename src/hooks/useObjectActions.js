// path: src/hooks/useObjectActions.js
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { handleSupabaseError } from '../utils/errorHandler';

export const useObjectActions = (refetch, setSelectedObjects) => {

  const handleSaveObject = async (formData, objectToEdit) => {
    const { error } = await supabase.rpc('create_or_update_object', {
      p_recipient_name: formData.recipient_name,
      p_object_type: formData.object_type,
      p_tracking_code: formData.tracking_code || null,
      p_control_number: objectToEdit ? objectToEdit.control_number : null,
      p_cep: formData.cep || null,
      p_street_name: formData.street_name || null,
      p_number: formData.number || null,
      p_neighborhood: formData.neighborhood || null,
      p_city_name: formData.city || null,
      p_state_uf: formData.state || null,
    });

    if (error) {
      toast.error(handleSupabaseError(error));
      return false;
    }
    
    toast.success(`Objeto ${objectToEdit ? 'atualizado' : 'criado'}!`);
    refetch();
    return true;
  };

  const updateObjectStatus = async (controlNumber, action) => {
    const rpc_function = action === 'deliver' ? 'deliver_object' : 'return_object';
    const { error } = await supabase.rpc(rpc_function, { p_control_number: controlNumber });
    if (error) toast.error(handleSupabaseError(error));
    else { toast.success('Status atualizado!'); refetch(); }
  };

  const handleBulkUpdateStatus = async (selectedObjects, newStatus) => {
    const toastId = toast.loading(`Atualizando ${selectedObjects.size} objetos...`);
    const { error } = await supabase.rpc('bulk_update_object_status', {
        p_control_numbers: Array.from(selectedObjects),
        p_new_status: newStatus
    });

    if (error) {
        toast.error(handleSupabaseError(error), { id: toastId });
    } else {
        toast.success(`Objetos atualizados para "${newStatus}"!`, { id: toastId });
        setSelectedObjects(new Set());
        refetch();
    }
  };

  const handleRevertStatus = async (controlNumber) => {
    const toastId = toast.loading('A reverter status do objeto...');
    const { error } = await supabase.rpc('revert_object_status', { p_control_number: controlNumber });
    if (error) { toast.error(handleSupabaseError(error), { id: toastId }); }
    else { toast.success('Status revertido para "Aguardando Retirada"!', { id: toastId }); refetch(); }
  };

  const handleArchiveAction = async () => {
    const toastId = toast.loading('A arquivar objetos concluídos...');
    const { error } = await supabase.rpc('archive_completed_objects');
    if (error) {
      toast.error(handleSupabaseError(error), { id: toastId });
      return false;
    }
    toast.success('Objetos arquivados!', { id: toastId });
    return true;
  };
  
  const handleUnarchive = async (controlNumber) => {
    const toastId = toast.loading('A recuperar objeto...');
    const { error } = await supabase.rpc('unarchive_object', { p_control_number: controlNumber });
    if (error) toast.error(handleSupabaseError(error), { id: toastId });
    else { toast.success('Objeto recuperado!', { id: toastId }); refetch(); }
  };

  return {
    handleSaveObject,
    updateObjectStatus,
    handleBulkUpdateStatus,
    handleRevertStatus,
    handleArchiveAction,
    handleUnarchive,
  };
};
