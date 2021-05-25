import React from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { useHistory } from "react-router-dom";
import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";


const URL = 'http://localhost:8080/rest'


const App = () => {

  const [authHeader, setAuth] = React.useState(new Headers({
  }));
  const [userName, setText] = React.useState("");
  const [pass, setPass] = React.useState("");
 
  const onLogin = (username, pass) => {
    setAuth(new Headers({
      'Authorization': 'Basic ' + Buffer.from(`${username}:${pass}`).toString('base64')
    }));
    setText(username);
    setPass(pass);
  }

  return (
    <Router>

        <Switch>
          <Route path="/app">
          <MainApp authHeader={authHeader} user={userName} pass={pass}/>
          </Route>
          <Route path="/">
            <Login onLogin={onLogin}/>
          </Route>
        </Switch>
    </Router>
  );
};

const MainApp = ({ authHeader, user, pass }) => {
  const socket = new SockJS('http://localhost:8080/gs-guide-websocket');
  const client = Stomp.over(socket)
  const [featchedLists, setLists] = React.useState([]);
  const [products, setProducts] = React.useState([]);

  const fetchh = (url, method) =>
    fetch(url, { method: method, headers: authHeader })

  React.useEffect(() => {
    const fetchJson = (url, method) =>
      fetch(url, { method: method, headers: authHeader}).then(response => response.json())

    const updateProducts = listId =>
      fetchJson(`${URL}/lists/${listId}/products`, 'GET')
        .then(result => setProducts(p => [...result, ...p.filter(product => product.listId !== listId)]))

      fetchJson(`${URL}/lists`, 'GET')
      .then(lists => {
        setLists(lists)
        lists.forEach(list => updateProducts(list.id))
        client.connect(`${user}`, `${pass}`, frame => {

          lists.forEach(list => {
            client.subscribe(`/topic/${list.id}`, msg => updateProducts(list.id))
          })
          client.subscribe("/topic/me", msg =>
          fetchJson(`${URL}/lists`, 'GET')
            .then(lists => {
              setLists(lists)
              lists.forEach(list => {
                updateProducts(list.id)
              client.subscribe(`/topic/${msg.body}`, msgq => updateProducts(msg.body))
              })
            }))
        })
      })
  
  }, [authHeader, user, pass]);

  const addProductMethod = (listId, productName) => {
    fetchh(`${URL}/lists/${listId}?productName=${productName}`, 'PUT')
  }

  const deleteMethod = (listId, productId) => {

    fetchh(`${URL}/lists/${listId}/${productId}`, 'DELETE')
  }

  const addListMethod = (listName) => {

    fetchh(`${URL}/lists?listName=${listName}`, 'PUT')
  }

  const deleteListMethod = (listId) => {

    fetchh(`${URL}/lists/${listId}`, 'DELETE')

    client.unsubscribe(`/topic/${listId}`)
  }
  
  return(
    < div >
    <h1>Shopping app</h1>
    <hr />
    <Adder label="Add List: " addtMethod={addListMethod} />
    <List lists={featchedLists} allProducts={products} onAddProduct={addProductMethod} onDelete={deleteMethod} listDelete={deleteListMethod} />
  </div >
  )
}

const Login = ({ onLogin }) => {
  const history = useHistory();
  const [userName, setText] = React.useState();
  const [pass, setPass] = React.useState();

  return (
    <>
      <label>Login</label>
      <input type="text" onChange={event => setText(event.target.value)} />
      <label>Pass</label>
      <input type="text" onChange={event => setPass(event.target.value)} />
      <button onClick={() =>  {
        onLogin(userName, pass) 
        history.push("/app")
      }}>
          Submit
        </button>
    </>
  )
}

const List = ({ lists, allProducts, onAddProduct, onDelete, listDelete }) =>
  <table style={{ border: "1px solid black", borderCollapse: "collapse" }}>
    <thead>
      <tr style={{ border: "1px solid black", borderCollapse: "collapse" }}>
        <th >Name</th>
        <th >Number of elements in the list</th>
        <th ></th>
        <th ></th>
      </tr>
    </thead>
    <tbody style={{ textAlign: 'center', verticalAlign: 'middle' }}>
      {
        lists.map(list =>
          <ListEntry key={list.id} list={list} products={allProducts.filter(product => product.listId === list.id)} onAddProduct={onAddProduct} onDelete={onDelete} listDelete={listDelete} />
        )
      }
    </tbody>
  </table>


const ListEntry = ({ list, products, onAddProduct, onDelete, listDelete }) => {

  const [isClicked, click] = React.useState(false)

  return (
    <>
      <tr style={{ border: "1px solid black" }}>
        <td >{list.listName}</td>
        <td >{products.length}</td>
        <td >
          <button onClick={() => click(c => !c)} > {!isClicked ? "Expand" : "Collapse"}</button>
        </td>
        <td><button onClick={() => listDelete(list.id)}>Delete</button></td>
      </tr>
      {
        isClicked && <ProductList listId={list.id} products={products} onAddProduct={onAddProduct} onDelete={onDelete} />
      }
    </>
  )
}

const ProductList = ({ listId, products, onAddProduct, onDelete }) => {
  const deleteProduct = productId => onDelete(listId, productId)
  const addProduct = productName => onAddProduct(listId, productName)
  console.log(products)
  return (
    <tr>
      <td colSpan="4">
        <ol>
          {
            products.map(product =>
              <ProductEntry key={product.productId} product={product} deleteProduct={deleteProduct} />
            )
          }
        </ol>
        <Adder label="Add product: " addtMethod={addProduct} />
      </td>
    </tr>
  )
}


const ProductEntry = ({ product, deleteProduct }) =>
  <li>
    <span>{product.name}</span>
    <button style={{ float: "right" }} onClick={() => deleteProduct(product.productId)} >Delete</button>
  </li>


const Adder = ({ addtMethod, label }) => {

  const [text, setText] = React.useState();

  return (
    <>
      <label>{label}</label>
      <input type="text" onChange={event => setText(event.target.value)} />
      <button onClick={() => addtMethod(text)}>Submit</button>
    </>
  )
}

export default App;
