// Need to use the React-specific entry point to import createApi
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// Define a service using a base URL and expected endpoints
export const albumApi = createApi({
  reducerPath: 'albumApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:8080/api/v1' }),
  endpoints: (builder) => ({
    getAlbumByName: builder.query({
      query: (name) => `/albums/${name}`,
    }),
    createAlbumMedia: builder.mutation({
      query: (data) => {
        let bodyFormData = new FormData();

        for(const file of data.files) {
          bodyFormData.append('file', file);
        }
        
        return {
          url: `/albums/${data.name}`,
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data;'
          },
          body: bodyFormData,
        }
      }
    })
  }),
})

// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const { useGetAlbumByNameQuery, useCreateAlbumMediaMutation } = albumApi;