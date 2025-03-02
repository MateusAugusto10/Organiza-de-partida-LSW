const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const dataFilePath = path.join(__dirname, 'data', 'matches.json');

const ensureDataFile = () => {
  const dirPath = path.join(__dirname, 'data');
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }
  
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify({ matches: [] }));
  }
};

ensureDataFile();

const readData = () => {
  return new Promise((resolve, reject) => {
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      
      try {
        const jsonData = JSON.parse(data);
        resolve(jsonData);
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
};

const writeData = (data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf8', (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

app.get('/api/matches', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.matches);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ler os dados' });
  }
});

app.get('/api/matches/:id', async (req, res) => {
  try {
    const data = await readData();
    const match = data.matches.find(m => m.id === req.params.id);
    
    if (!match) {
      return res.status(404).json({ error: 'Partida não encontrada' });
    }
    
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ler os dados' });
  }
});

app.post('/api/matches', async (req, res) => {
  try {
    const { title, location, date, time } = req.body;
    
    if (!title || !location || !date || !time) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }
    
    const data = await readData();
    
    const newMatch = {
      id: Date.now().toString(),
      title,
      location,
      date,
      time,
      players: [],
      created_at: new Date().toISOString()
    };
    
    data.matches.push(newMatch);
    await writeData(data);
    
    res.status(201).json(newMatch);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar os dados' });
  }
});

app.put('/api/matches/:id', async (req, res) => {
  try {
    const { title, location, date, time } = req.body;
    const data = await readData();
    const matchIndex = data.matches.findIndex(m => m.id === req.params.id);
    
    if (matchIndex === -1) {
      return res.status(404).json({ error: 'Partida não encontrada' });
    }
    
    data.matches[matchIndex] = {
      ...data.matches[matchIndex],
      title: title || data.matches[matchIndex].title,
      location: location || data.matches[matchIndex].location,
      date: date || data.matches[matchIndex].date,
      time: time || data.matches[matchIndex].time,
      updated_at: new Date().toISOString()
    };
    
    await writeData(data);
    res.json(data.matches[matchIndex]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar os dados' });
  }
});

app.delete('/api/matches/:id', async (req, res) => {
  try {
    const data = await readData();
    const matchIndex = data.matches.findIndex(m => m.id === req.params.id);
    
    if (matchIndex === -1) {
      return res.status(404).json({ error: 'Partida não encontrada' });
    }
    
    data.matches.splice(matchIndex, 1);
    await writeData(data);
    
    res.json({ message: 'Partida excluída com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir a partida' });
  }
});

app.post('/api/matches/:id/players', async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    }
    
    const data = await readData();
    const matchIndex = data.matches.findIndex(m => m.id === req.params.id);
    
    if (matchIndex === -1) {
      return res.status(404).json({ error: 'Partida não encontrada' });
    }
    
    const newPlayer = {
      id: Date.now().toString(),
      name,
      phone,
      confirmed: false
    };
    
    data.matches[matchIndex].players.push(newPlayer);
    await writeData(data);
    
    res.status(201).json(newPlayer);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar jogador' });
  }
});

app.delete('/api/matches/:matchId/players/:playerId', async (req, res) => {
  try {
    const { matchId, playerId } = req.params;
    
    const data = await readData();
    const matchIndex = data.matches.findIndex(m => m.id === matchId);
    
    if (matchIndex === -1) {
      return res.status(404).json({ error: 'Partida não encontrada' });
    }
    
    const playerIndex = data.matches[matchIndex].players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      return res.status(404).json({ error: 'Jogador não encontrado' });
    }
    
    data.matches[matchIndex].players.splice(playerIndex, 1);
    await writeData(data);
    
    res.json({ message: 'Jogador removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover jogador' });
  }
});

app.patch('/api/matches/:matchId/players/:playerId', async (req, res) => {
  try {
    const { matchId, playerId } = req.params;
    const { confirmed } = req.body;
    
    if (confirmed === undefined) {
      return res.status(400).json({ error: 'Status de confirmação é obrigatório' });
    }
    
    const data = await readData();
    const matchIndex = data.matches.findIndex(m => m.id === matchId);
    
    if (matchIndex === -1) {
      return res.status(404).json({ error: 'Partida não encontrada' });
    }
    
    const playerIndex = data.matches[matchIndex].players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      return res.status(404).json({ error: 'Jogador não encontrado' });
    }
    
    data.matches[matchIndex].players[playerIndex].confirmed = confirmed;
    await writeData(data);
    
    res.json(data.matches[matchIndex].players[playerIndex]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar confirmação' });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'frontend')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});