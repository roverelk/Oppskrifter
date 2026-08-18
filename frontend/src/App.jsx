import React, { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import CssBaseline from '@mui/material/CssBaseline'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Fab from '@mui/material/Fab'
import IconButton from '@mui/material/IconButton'
import Snackbar from '@mui/material/Snackbar'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { ThemeProvider, useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import RecipeDetail from './components/RecipeDetail'
import RecipeForm from './components/RecipeForm'
import RecipeList from './components/RecipeList'
import { MODE_STORAGE_KEY, buildTheme } from './theme'

const DRAWER_WIDTH = 300

function readStoredMode() {
  try {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function errorMessage(err, fallback) {
  return err?.response?.data?.detail || err?.message || fallback
}

function Browser({ mode, onToggleMode }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [recipes, setRecipes] = useState([])
  const [selected, setSelected] = useState(null)
  const [listLoading, setListLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState(null)

  const [query, setQuery] = useState('')
  const [activeTags, setActiveTags] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState({ open: false, mode: 'create' })
  const [confirmDelete, setConfirmDelete] = useState(false)

  const fetchList = useCallback(async () => {
    setListLoading(true)
    try {
      const res = await axios.get('/api/recipes')
      setRecipes(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(errorMessage(err, 'Could not load the recipe list.'))
    } finally {
      setListLoading(false)
    }
  }, [])

  const openRecipe = useCallback(async (dir) => {
    setDetailLoading(true)
    try {
      const res = await axios.get(`/api/recipes/${encodeURIComponent(dir)}`)
      setSelected(res.data)
    } catch (err) {
      setError(errorMessage(err, 'Could not load that recipe.'))
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const allTags = useMemo(() => {
    const set = new Set()
    recipes.forEach((r) => (r.tags || []).forEach((t) => set.add(t)))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [recipes])

  const visibleRecipes = useMemo(() => {
    const q = query.trim().toLowerCase()
    return recipes.filter((r) => {
      const matchesQuery =
        !q ||
        r.title?.toLowerCase().includes(q) ||
        (r.tags || []).some((t) => t.toLowerCase().includes(q))
      const matchesTags = activeTags.every((t) => (r.tags || []).includes(t))
      return matchesQuery && matchesTags
    })
  }, [recipes, query, activeTags])

  // A tag can disappear when recipes change; don't leave a dead filter behind.
  useEffect(() => {
    setActiveTags((prev) => {
      const kept = prev.filter((t) => allTags.includes(t))
      return kept.length === prev.length ? prev : kept
    })
  }, [allTags])

  function toggleTag(tag) {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  function handleSelect(dir) {
    setDrawerOpen(false)
    if (dir !== selected?.dir) openRecipe(dir)
  }

  async function handleDelete() {
    const dir = selected?.dir
    setConfirmDelete(false)
    if (!dir) return
    try {
      await axios.delete(`/api/recipes/${encodeURIComponent(dir)}`)
      setSelected(null)
      await fetchList()
    } catch (err) {
      setError(errorMessage(err, 'Could not delete that recipe.'))
    }
  }

  async function handleSaved(dir) {
    setForm({ open: false, mode: 'create' })
    await fetchList()
    if (dir) openRecipe(dir)
  }

  const browser = (
    <RecipeList
      recipes={visibleRecipes}
      allTags={allTags}
      query={query}
      onQueryChange={setQuery}
      activeTags={activeTags}
      onToggleTag={toggleTag}
      selectedDir={selected?.dir}
      onSelect={handleSelect}
      loading={listLoading}
    />
  )

  // On phones the whole app is one menu: the drawer holds search, tag filters,
  // the recipe list and the create action. Nothing else lives in the top bar.
  const showDetailPane = !isMobile || !!selected

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Toolbar>
          {isMobile &&
            (selected ? (
              <IconButton
                edge="start"
                color="inherit"
                aria-label="Back to recipes"
                onClick={() => setSelected(null)}
                sx={{ mr: 1 }}
              >
                <ArrowBackIcon />
              </IconButton>
            ) : (
              <IconButton
                edge="start"
                color="inherit"
                aria-label="Open menu"
                onClick={() => setDrawerOpen(true)}
                sx={{ mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
            ))}
          <Typography variant="h6" component="div" noWrap sx={{ flexGrow: 1 }}>
            {isMobile && selected ? selected.title : 'Oppskrifter'}
          </Typography>
          {!isMobile && (
            <Button
              color="inherit"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setForm({ open: true, mode: 'create' })}
              sx={{ mr: 1, borderColor: 'currentColor' }}
            >
              New recipe
            </Button>
          )}
          <Tooltip title={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            <IconButton color="inherit" onClick={onToggleMode} aria-label="Toggle colour theme">
              {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{ sx: { width: '86%', maxWidth: DRAWER_WIDTH } }}
        >
          {/* Sits under the fixed AppBar. */}
          <Toolbar />
          <Divider />
          <Box sx={{ px: 2, pt: 2 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setDrawerOpen(false)
                setForm({ open: true, mode: 'create' })
              }}
            >
              New recipe
            </Button>
          </Box>
          {browser}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          <Toolbar />
          {browser}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <Toolbar />
        <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
          {showDetailPane ? (
            <RecipeDetail
              recipe={selected}
              loading={detailLoading}
              onEdit={() => setForm({ open: true, mode: 'edit' })}
              onDelete={() => setConfirmDelete(true)}
            />
          ) : (
            // Phone, nothing selected: the list is the page.
            <Box sx={{ mx: -2 }}>{browser}</Box>
          )}
        </Container>
      </Box>

      {isMobile && !selected && (
        <Fab
          color="secondary"
          aria-label="New recipe"
          onClick={() => setForm({ open: true, mode: 'create' })}
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
        >
          <AddIcon />
        </Fab>
      )}

      <RecipeForm
        open={form.open}
        mode={form.mode}
        recipe={selected}
        fullScreen={isMobile}
        onClose={() => setForm({ open: false, mode: 'create' })}
        onSaved={handleSaved}
      />

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete “{selected?.title}”?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This removes the recipe folder and everything in it. It cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)} variant="filled">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default function App() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true })
  const [mode, setMode] = useState(() => readStoredMode() || (prefersDark ? 'dark' : 'light'))

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage.setItem(MODE_STORAGE_KEY, next)
      } catch {
        /* storage unavailable — the toggle still works for this session */
      }
      return next
    })
  }, [])

  const theme = useMemo(() => buildTheme(mode), [mode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Browser mode={mode} onToggleMode={toggleMode} />
    </ThemeProvider>
  )
}
