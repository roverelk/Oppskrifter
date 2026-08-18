import React from 'react'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

/** A hand-written markdown table, parsed by the backend into headers + rows. */
export default function RecipeTable({ headers, rows }) {
  if (!headers?.length && !rows?.length) return null

  return (
    // Recipes are read on phones, so a wide table scrolls itself rather than
    // widening the page.
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table size="small">
        {headers?.length > 0 && (
          <TableHead>
            <TableRow>
              {headers.map((h, i) => (
                <TableCell key={i} sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {rows?.map((row, i) => (
            <TableRow key={i}>
              {row.map((cell, j) => (
                <TableCell key={j}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
