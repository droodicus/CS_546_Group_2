import { useLocation, Navigate } from 'react-router-dom';
import { createContext, useState, useContext } from 'react';
import axios from 'axios';
import env from '../env';

let AuthContext = createContext({
  user: null,
  signin: null,
  signout: null,
});

function AuthProvider({ children }) {
  const storedJwt = localStorage.getItem('token');
  let storedUser = localStorage.getItem('user');
  storedUser = JSON.parse(storedUser);

  const [jwt, setJwt] = useState(storedJwt || null);
  const placeholderUser = {
    authenticated: jwt ? true : false,
    email: storedUser?.email ? storedUser.email : '',
    firstName: storedUser?.firstName ? storedUser.firstName : '',
    lastName: storedUser?.lastName ? storedUser.lastName : '',
    role: storedUser?.role ? storedUser.role : '',
    token: jwt,
  };
  const [user, setUser] = useState(placeholderUser);

  const authenticate = async (loginData, callback) => {
    try {
      const { email, password } = loginData;
      const res = await axios.post(`${env.apiUrl}/login`, {
        email,
        password,
      });
      callback(res);
    } catch (e) {
      callback(e);
    }
  };

  const unauthenticate = async (callback) => {
    try {
      const res = await axios.get(`${env?.apiUrl}/logout`);
      callback(res);
    } catch (e) {
      callback(e);
    }
  };

  let signin = async (loginInfo, callback) => {
    return await authenticate(loginInfo, (res) => {
      const data = res.data;
      if (!data) return callback(res);
      console.log(data);
      setJwt(data.token);
      localStorage.setItem('token', data.token);
      const newUser = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      };
      localStorage.setItem('user', JSON.stringify(newUser));
      // Temporary work around
      setUser((prev) => {
        return {
          ...prev,
          authenticated: data.authenticated,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          token: data.token,
        };
      });
      console.warn(user);
      callback(data.authenticated);
    });
  };

  let signout = async (callback) => {
    return await unauthenticate((res) => {
      const data = res.data;
      if (!data) return callback(res);
      // could add error handling in case fails
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setJwt(null);
      setUser(placeholderUser);
      callback();
    });
  };

  let value = { user, signin, signout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  return useContext(AuthContext);
}

function RequireAuth({ children }) {
  let auth = useAuth();
  let location = useLocation();

  if (!auth.user.authenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} />;
  }

  return children;
}

function RequiteUnAuth({ children }) {
  let auth = useAuth();
  let location = useLocation();
  let from = location.state?.from?.pathname || '/';

  if (auth.user.authenticated) {
    return <Navigate to={from} state={{ from: location }} />;
  }

  return children;
}

const auth = {
  useAuth,
  AuthProvider,
  RequireAuth,
  RequiteUnAuth,
};

export default auth;
