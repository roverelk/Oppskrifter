import React from 'react'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ClearIcon from '@mui/icons-material/Clear'
import IconButton from '@mui/material/IconButton'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import SearchIcon from '@mui/icons-material/Search'

/**
 * Search field + tag filter + the list of recipes. Rendered in the permanent
 * sidebar on desktop and inside the single temporary drawer (and as the root
 * view) on phones.
 */
export default function RecipeList({
  recipes,
  allTags,
  query,
  onQueryChange,
  activeTags,
  onToggleTag,
  selectedDir,
  onSelect,
  loading,
}) {
  const filtering = query.trim() !== '' || activeTags.length > 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <TextField
          fullWidth
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search recipes"
          inputProps={{ 'aria-label': 'Search recipes' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: query ? (
              <InputAdornment position="end">
                <IconButton size="small" aria-label="Clear search" onClick={() => onQueryChange('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        {allTags.length > 0 && (
          <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.75} sx={{ mt: 1.5 }}>
            {allTags.map((tag) => {
              const active = activeTags.includes(tag)
              return (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  color={active ? 'primary' : 'default'}
                  variant={active ? 'filled' : 'outlined'}
                  onClick={() => onToggleTag(tag)}
                  aria-pressed={active}
                />
              )
            })}
          </Stack>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 1, pb: 2 }}>
        {loading ? (
          <Box sx={{ px: 1 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={56} sx={{ borderRadius: 999, mb: 0.5 }} />
            ))}
          </Box>
        ) : recipes.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3 }}>
            {filtering ? 'No recipes match your filters.' : 'No recipes yet — add your first one.'}
          </Typography>
        ) : (
          <List disablePadding>
            {recipes.map((r) => (
              <ListItemButton
                key={r.dir}
                selected={r.dir === selectedDir}
                onClick={() => onSelect(r.dir)}
              >
                <ListItemAvatar>
                  <Avatar
                    variant="rounded"
                    src={r.image_url || undefined}
                    sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}
                  >
                    <RestaurantMenuIcon fontSize="small" />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={r.title}
                  primaryTypographyProps={{ noWrap: true, fontWeight: 500 }}
                  secondary={r.tags?.length ? r.tags.join(' · ') : null}
                  secondaryTypographyProps={{ noWrap: true, variant: 'caption' }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
    </Box>
  )
}
