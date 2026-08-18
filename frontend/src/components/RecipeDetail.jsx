import React from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'

function SectionTitle({ children }) {
  return (
    <Typography variant="subtitle2" color="primary.main" sx={{ mb: 1.5 }}>
      {children}
    </Typography>
  )
}

export default function RecipeDetail({ recipe, loading, onEdit, onDelete }) {
  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={240} />
        <Skeleton width="55%" height={48} />
        <Skeleton variant="rounded" height={180} />
        <Skeleton variant="rounded" height={220} />
      </Stack>
    )
  }

  if (!recipe) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 4, sm: 6 },
          textAlign: 'center',
          color: 'text.secondary',
          borderStyle: 'dashed',
        }}
      >
        <RestaurantMenuIcon sx={{ fontSize: 48, color: 'primary.light' }} />
        <Typography variant="h6" sx={{ mt: 1, color: 'text.primary' }}>
          Pick a recipe
        </Typography>
        <Typography variant="body2">
          Choose one from the list, or create a new recipe to get started.
        </Typography>
      </Paper>
    )
  }

  const {
    title,
    tags,
    image_url: imageUrl,
    ingredients,
    instructions,
    ingredients_heading: ingredientsHeading,
    instructions_heading: instructionsHeading,
    html,
  } = recipe

  return (
    <Stack spacing={2.5}>
      {imageUrl && (
        <Box
          component="img"
          src={imageUrl}
          alt={title}
          sx={{
            width: '100%',
            height: 'auto',
            maxHeight: { xs: 220, md: 340 },
            objectFit: 'cover',
            borderRadius: 3,
            display: 'block',
          }}
        />
      )}

      <Box>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {tags?.length > 0 && (
          <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.75} sx={{ mt: 1.5 }}>
            {tags.map((t) => (
              <Chip key={t} label={t} size="small" variant="outlined" color="primary" />
            ))}
          </Stack>
        )}
      </Box>

      {ingredients?.length > 0 ? (
        <Card>
          <CardContent>
            <SectionTitle>{ingredientsHeading || 'Ingredients'}</SectionTitle>
            <Stack divider={<Divider flexItem />} spacing={0}>
              {ingredients.map((item, i) => (
                <Typography key={i} variant="body1" sx={{ py: 0.75 }}>
                  {item}
                </Typography>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {instructions?.length > 0 ? (
        <Card>
          <CardContent>
            <SectionTitle>{instructionsHeading || 'Instructions'}</SectionTitle>
            <Stack spacing={2}>
              {instructions.map((step, i) => (
                <Stack key={i} direction="row" spacing={2} alignItems="flex-start">
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 14,
                      fontWeight: 500,
                      mt: '2px',
                    }}
                  >
                    {i + 1}
                  </Box>
                  <Typography variant="body1">{step}</Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {/* Recipes whose markdown has no recognised Ingredients/Instructions
          headings still deserve to be readable — fall back to the rendered HTML. */}
      {!ingredients?.length && !instructions?.length && (
        <Card>
          <CardContent>
            <Box className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
          </CardContent>
        </Card>
      )}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pb: 2 }}>
        <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={onEdit}>
          Edit
        </Button>
        <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={onDelete}>
          Delete
        </Button>
      </Stack>
    </Stack>
  )
}
