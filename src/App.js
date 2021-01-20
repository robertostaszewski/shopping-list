import React from 'react';
import { Client, } from '@stomp/stompjs';

const URL = 'http://localhost:8080/rest'

const client = new Client({
  brokerURL: 'ws://localhost:8080/gs-guide-websocket',
  debug: function (str) {
    console.log(str);
  }
})

const App = () => {
  const [featchedLists, setLists] = React.useState([]);
  const [products, setProducts] = React.useState([]);

  React.useEffect(() => {
    const fetchJson = url =>
      fetch(url).then(response => response.json())

    const updateProducts = listId =>
      fetchJson(`${URL}/lists/${listId}/products`)
        .then(result => setProducts(p => [...result, ...p.filter(product => product.listId !== listId)]))

    fetchJson(`${URL}/lists`)
      .then(lists => {
        setLists(lists)
        lists.forEach(list => updateProducts(list.id))

        client.onConnect = frame => {
          lists.forEach(list => {
            client.subscribe(`/topic/${list.id}`, msg => updateProducts(list.id))
          })

          client.subscribe("/topic/me", msg =>
            fetchJson(`${URL}/lists`)
              .then(lists => {
                setLists(lists)
                console.log(msg.body)
                updateProducts(msg.body)
                client.subscribe(`/topic/${msg.body}`, msgq => updateProducts(msg.body))
              }))
        }

        client.activate();
      })
  }, []);

  const addProductMethod = (listId, productName) => {
    const requestOptions = {
      method: 'PUT'
    };

    fetch(`${URL}/lists/${listId}?productName=${productName}`, requestOptions)
  }

  const deleteMethod = (listId, productId) => {
    const requestOptions = {
      method: 'DELETE'
    };

    fetch(`${URL}/lists/${listId}/${productId}`, requestOptions)
  }

  const addListMethod = (listName) => {
    const requestOptions = {
      method: 'PUT'
    };

    fetch(`${URL}/lists?listName=${listName}`, requestOptions)
  }

  const deleteListMethod = (listId) => {
    const requestOptions = {
      method: 'DELETE'
    };

    fetch(`${URL}/lists/${listId}`, requestOptions)
    
    client.unsubscribe(`/topic/${listId}`)
  }

  return (
    < div >
      <h1>Shopping app</h1>
      <hr />
      <Adder label="Add List: " addtMethod={addListMethod} />
      <List lists={featchedLists} allProducts={products} onAddProduct={addProductMethod} onDelete={deleteMethod} listDelete={deleteListMethod} />
    </div >
  );
};

const List = ({ lists, allProducts, onAddProduct, onDelete, listDelete }) =>
  <table style={{ border: "1px solid black", borderCollapse: "collapse"}}>
    <thead>
      <tr style={{ border: "1px solid black", borderCollapse: "collapse"}}>
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
      <tr style={{ border: "1px solid black"}}>
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
    <button style={{float: "right"}} onClick={() => deleteProduct(product.productId)} >Delete</button>
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
