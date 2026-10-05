export const paths = {
  home: () => '/',
  newContract: () => '/contracts/new',
  contract: (id: string) => `/contracts/${id}`,
  editContract: (id: string) => `/contracts/${id}/edit`,
  notice: (id: string) => `/contracts/${id}/notice`,
};
