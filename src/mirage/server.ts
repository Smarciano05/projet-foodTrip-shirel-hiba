import { createServer, Model, Response } from 'miragejs';

const STORAGE_KEY = 'foodtrip-db';

export function makeServer() {
  return createServer({
    logging: false,

    models: {
      user: Model,
      favorite: Model,
      tasted: Model,
      note: Model,
    },

    seeds(server) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        server.db.loadData(JSON.parse(saved));
        return;
      }
      server.create('user', {
        name: 'Demo',
        email: 'demo@foodtrip.fr',
        password: 'demo1234',
      } as any);
    },

    routes() {
      this.passthrough('https://www.themealdb.com/**');
      this.passthrough('https://api.restcountries.com/**');
      this.passthrough('https://flags.restcountries.com/**');
      this.passthrough('https://data.geopf.fr/**');
      this.passthrough('https://overpass-api.de/**');
      this.passthrough('https://nominatim.openstreetmap.org/**');

      this.namespace = 'api';
      this.timing = 400;

      const persist = (schema: any) =>
        localStorage.setItem(STORAGE_KEY, JSON.stringify(schema.db.dump()));

      const publicUser = (u: any) => ({ id: u.id, name: u.name, email: u.email });

      const currentUser = (schema: any, request: any) => {
        const header =
          request.requestHeaders['Authorization'] ??
          request.requestHeaders['authorization'] ??
          '';
        const id = header.replace('Bearer fake-token-', '');
        return id ? schema.find('user', id) : null;
      };

      const unauthorized = () => new Response(401, {}, { message: 'Non connecté' });

      // ---------- Authentification ----------
      this.post('/register', (schema: any, request) => {
        const { name, email, password } = JSON.parse(request.requestBody);
        if (!name || !email || !password) {
          return new Response(400, {}, { message: 'Tous les champs sont obligatoires' });
        }
        if (schema.findBy('user', { email })) {
          return new Response(409, {}, { message: 'Cet email est déjà utilisé' });
        }
        const user = schema.create('user', { name, email, password });
        persist(schema);
        return new Response(201, {}, { token: `fake-token-${user.id}`, user: publicUser(user) });
      });

      this.post('/login', (schema: any, request) => {
        const { email, password } = JSON.parse(request.requestBody);
        const user = schema.findBy('user', { email });
        if (!user || user.password !== password) {
          return new Response(401, {}, { message: 'Email ou mot de passe incorrect' });
        }
        return { token: `fake-token-${user.id}`, user: publicUser(user) };
      });

      this.post('/logout', () => new Response(204));

      this.get('/profile', (schema: any, request) => {
        const user = currentUser(schema, request);
        return user ? publicUser(user) : unauthorized();
      });

      this.put('/profile', (schema: any, request) => {
        const user = currentUser(schema, request);
        if (!user) return unauthorized();
        const { name, email } = JSON.parse(request.requestBody);
        user.update({ name: name ?? user.name, email: email ?? user.email });
        persist(schema);
        return publicUser(user);
      });

      // ---------- Carnet (CRUD), utilisé plus tard ----------
      const collections = [
        { path: 'favorites', type: 'favorite' },
        { path: 'tasted', type: 'tasted' },
        { path: 'notes', type: 'note' },
      ];

      for (const { path, type } of collections) {
        this.get(`/${path}`, (schema: any, request) => {
          const user = currentUser(schema, request);
          if (!user) return unauthorized();
          return schema.where(type, { userId: user.id }).models.map((m: any) => m.attrs);
        });

        this.post(`/${path}`, (schema: any, request) => {
          const user = currentUser(schema, request);
          if (!user) return unauthorized();
          const item = schema.create(type, { ...JSON.parse(request.requestBody), userId: user.id });
          persist(schema);
          return new Response(201, {}, item.attrs);
        });

        this.put(`/${path}/:id`, (schema: any, request) => {
          const user = currentUser(schema, request);
          if (!user) return unauthorized();
          const item = schema.find(type, request.params['id']);
          if (!item || item.userId !== user.id) {
            return new Response(404, {}, { message: 'Élément introuvable' });
          }
          item.update(JSON.parse(request.requestBody));
          persist(schema);
          return item.attrs;
        });

        this.delete(`/${path}/:id`, (schema: any, request) => {
          const user = currentUser(schema, request);
          if (!user) return unauthorized();
          const item = schema.find(type, request.params['id']);
          if (!item || item.userId !== user.id) {
            return new Response(404, {}, { message: 'Élément introuvable' });
          }
          item.destroy();
          persist(schema);
          return new Response(204);
        });
      }
    },
  });
}
