import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SELECT_COLLECTION = '*, collection_items(id, user_item_id, added_at, user_items(*, items(*)))'

export function useCollections(userId, category) {
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId || !category) return
    setLoading(true)
    const { data } = await supabase
      .from('collections')
      .select(SELECT_COLLECTION)
      .eq('user_id', userId)
      .eq('category', category)
      .order('created_at', { ascending: true })
    setCollections(data || [])
    setLoading(false)
  }, [userId, category])

  useEffect(() => { load() }, [load])

  async function createCollection(name = 'Minha coleção') {
    const { data, error } = await supabase
      .from('collections')
      .insert({ user_id: userId, category, name })
      .select(SELECT_COLLECTION)
      .single()
    if (!error && data) setCollections(prev => [...prev, data])
    return { data, error }
  }

  async function renameCollection(id, name) {
    const { error } = await supabase.from('collections').update({ name }).eq('id', id)
    if (!error) setCollections(prev => prev.map(c => c.id === id ? { ...c, name } : c))
    return { error }
  }

  async function deleteCollection(id) {
    const { error } = await supabase.from('collections').delete().eq('id', id)
    if (!error) setCollections(prev => prev.filter(c => c.id !== id))
    return { error }
  }

  async function addItemToCollection(collectionId, userItemId) {
    const { data, error } = await supabase
      .from('collection_items')
      .insert({ collection_id: collectionId, user_item_id: userItemId })
      .select('id, user_item_id, added_at, user_items(*, items(*))')
      .single()
    if (!error && data) {
      setCollections(prev => prev.map(c => c.id === collectionId
        ? { ...c, collection_items: [...(c.collection_items || []), data] }
        : c))
    }
    return { data, error }
  }

  async function removeItemFromCollection(collectionId, collectionItemId) {
    const { error } = await supabase.from('collection_items').delete().eq('id', collectionItemId)
    if (!error) {
      setCollections(prev => prev.map(c => c.id === collectionId
        ? { ...c, collection_items: (c.collection_items || []).filter(ci => ci.id !== collectionItemId) }
        : c))
    }
    return { error }
  }

  return {
    collections,
    loading,
    createCollection,
    renameCollection,
    deleteCollection,
    addItemToCollection,
    removeItemFromCollection,
  }
}
